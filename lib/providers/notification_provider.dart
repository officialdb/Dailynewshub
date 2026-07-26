import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/api_config.dart';
import '../models/app_notification.dart';
import '../services/news_api_service.dart';
import 'auth_provider.dart';

class NotificationState {
  final List<AppNotification> notifications;
  final bool isLoading;
  final bool isConnected;
  final String? errorMessage;

  const NotificationState({
    this.notifications = const [],
    this.isLoading = false,
    this.isConnected = false,
    this.errorMessage,
  });

  int get unreadCount => notifications.length;

  NotificationState copyWith({
    List<AppNotification>? notifications,
    bool? isLoading,
    bool? isConnected,
    String? errorMessage,
    bool clearError = false,
  }) {
    return NotificationState(
      notifications: notifications ?? this.notifications,
      isLoading: isLoading ?? this.isLoading,
      isConnected: isConnected ?? this.isConnected,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class NotificationNotifier extends Notifier<NotificationState> {
  late final NewsApiService _apiService;
  final Set<String> _notificationIds = {};
  final StreamController<Map<String, dynamic>> _eventController =
      StreamController<Map<String, dynamic>>.broadcast();

  String? _accessToken;
  bool _isConnecting = false;
  WebSocket? _socket;
  StreamSubscription<dynamic>? _socketSubscription;
  Timer? _reconnectTimer;

  Stream<Map<String, dynamic>> get events => _eventController.stream;

  @override
  NotificationState build() {
    _apiService = NewsApiService();

    ref.listen<AuthState>(authProvider, (prev, next) {
      final nextToken = next.user?.accessToken;
      final prevToken = prev?.user?.accessToken;
      if (nextToken != prevToken) {
        _onTokenChanged(nextToken);
      }
    });

    // Handle initial token if already available — deferred to after build()
    final initialToken = ref.read(authProvider).user?.accessToken;
    if (initialToken != null && initialToken.isNotEmpty) {
      Future.microtask(() => _onTokenChanged(initialToken));
    }

    return const NotificationState();
  }

  void _onTokenChanged(String? newToken) {
    if (newToken == _accessToken) return;

    _clearSessionState();
    _accessToken = newToken;

    if (_accessToken == null || _accessToken!.isEmpty) {
      state = const NotificationState();
      return;
    }

    unawaited(refreshNotifications(force: true));
    unawaited(_connectLiveFeed());
  }

  Future<void> refreshNotifications({bool force = false}) async {
    final accessToken = _accessToken;
    if (accessToken == null || accessToken.isEmpty) return;
    if (state.isLoading && !force) return;

    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final items =
          await _apiService.fetchNotifications(accessToken: accessToken);
      _mergeNotifications(items);
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> _connectLiveFeed() async {
    if (_isConnecting || state.isConnected) return;

    final accessToken = _accessToken;
    if (accessToken == null || accessToken.isEmpty) return;

    _isConnecting = true;
    try {
      await _socketSubscription?.cancel();
      await _socket?.close();

      final apiUri = Uri.parse(ApiConfig.baseUrl);
      final socketUri = apiUri.replace(
        scheme: apiUri.scheme == 'https' ? 'wss' : 'ws',
        path: '/api/v1/ws/news-feed',
        queryParameters: {'token': accessToken},
      );

      _socket = await WebSocket.connect(socketUri.toString());
      state = state.copyWith(isConnected: true);

      _socketSubscription = _socket!.listen(
        _handleSocketMessage,
        onError: _handleSocketError,
        onDone: _handleSocketDone,
        cancelOnError: true,
      );
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      _scheduleReconnect();
    } finally {
      _isConnecting = false;
    }
  }

  void _handleSocketMessage(dynamic message) {
    try {
      final payload = message is String
          ? jsonDecode(message)
          : message is List<int>
              ? jsonDecode(utf8.decode(message))
              : message;

      if (payload is! Map<String, dynamic>) return;

      if (!_eventController.isClosed) {
        _eventController.add(payload);
      }

      final type = payload['type']?.toString();
      if (type == 'notification') {
        final notificationId = payload['notification_id']?.toString() ??
            'live-${DateTime.now().microsecondsSinceEpoch}';
        final notification = AppNotification(
          id: notificationId,
          title: payload['title']?.toString() ?? 'Notification',
          body: payload['body']?.toString() ?? '',
          articleId: payload['article_id']?.toString(),
          articleTitle: payload['article_title']?.toString(),
          createdAt:
              DateTime.tryParse(payload['sent_at']?.toString() ?? '') ??
                  DateTime.now(),
          sentAt: DateTime.tryParse(payload['sent_at']?.toString() ?? ''),
        );
        _addNotification(notification);
      }
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
    }
  }

  void _handleSocketError(Object error) {
    state = state.copyWith(
        isConnected: false, errorMessage: error.toString());
    _scheduleReconnect();
  }

  void _handleSocketDone() {
    state = state.copyWith(isConnected: false);
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    final accessToken = _accessToken;
    if (accessToken == null || accessToken.isEmpty) return;

    _reconnectTimer = Timer(const Duration(seconds: 10), () {
      if (_accessToken != null && _accessToken!.isNotEmpty) {
        unawaited(_connectLiveFeed());
      }
    });
  }

  void _mergeNotifications(List<AppNotification> items) {
    final current = List<AppNotification>.from(state.notifications);

    for (final item in items) {
      if (_notificationIds.contains(item.id)) {
        final index = current.indexWhere((n) => n.id == item.id);
        if (index != -1) {
          current[index] = item;
        }
        continue;
      }
      _notificationIds.add(item.id);
      current.add(item);
    }

    current.sort((a, b) {
      final aTime = a.sentAt ?? a.createdAt;
      final bTime = b.sentAt ?? b.createdAt;
      return bTime.compareTo(aTime);
    });

    state = state.copyWith(notifications: current);
  }

  void _addNotification(AppNotification notification) {
    if (_notificationIds.contains(notification.id)) return;

    _notificationIds.add(notification.id);
    final current = [notification, ...state.notifications];
    state = state.copyWith(notifications: current);
  }

  void clearAll() {
    _notificationIds.clear();
    state = state.copyWith(notifications: <AppNotification>[]);
  }

  void _clearSessionState() {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _socketSubscription?.cancel();
    _socketSubscription = null;
    _socket?.close();
    _socket = null;
    _notificationIds.clear();
  }
}

final notificationProvider =
    NotifierProvider<NotificationNotifier, NotificationState>(
        NotificationNotifier.new);
