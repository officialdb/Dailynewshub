import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

import '../config/api_config.dart';
import '../models/app_notification.dart';
import '../services/news_api_service.dart';
import 'auth_provider.dart';

class NotificationProvider with ChangeNotifier {
  NotificationProvider({NewsApiService? apiService})
    : _apiService = apiService ?? NewsApiService();

  final NewsApiService _apiService;
  final List<AppNotification> _notifications = [];
  final Set<String> _notificationIds = {};
  final StreamController<Map<String, dynamic>> _eventController =
      StreamController<Map<String, dynamic>>.broadcast();

  String? _accessToken;
  bool _isLoading = false;
  bool _isConnecting = false;
  bool _isConnected = false;
  String? _errorMessage;
  WebSocket? _socket;
  StreamSubscription<dynamic>? _socketSubscription;
  Timer? _reconnectTimer;

  bool get isLoading => _isLoading;

  bool get isConnected => _isConnected;

  String? get errorMessage => _errorMessage;

  List<AppNotification> get notifications => List.unmodifiable(_notifications);

  int get unreadCount => _notifications.length;

  Stream<Map<String, dynamic>> get events => _eventController.stream;

  void setAuthProvider(AuthProvider authProvider) {
    final nextToken = authProvider.currentUser?.accessToken;
    final tokenChanged = nextToken != _accessToken;

    if (!tokenChanged) {
      return;
    }

    _clearSessionState();
    _accessToken = nextToken;

    if (_accessToken == null || _accessToken!.isEmpty) {
      _clearSessionState();
      notifyListeners();
      return;
    }

    unawaited(refreshNotifications(force: true));
    unawaited(_connectLiveFeed());
  }

  Future<void> refreshNotifications({bool force = false}) async {
    final accessToken = _accessToken;
    if (accessToken == null || accessToken.isEmpty || _isLoading && !force) {
      return;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final items = await _apiService.fetchNotifications(
        accessToken: accessToken,
      );
      _mergeNotifications(items);
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _connectLiveFeed() async {
    if (_isConnecting || _isConnected) {
      return;
    }

    final accessToken = _accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      return;
    }

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
      _isConnected = true;
      notifyListeners();

      _socketSubscription = _socket!.listen(
        _handleSocketMessage,
        onError: _handleSocketError,
        onDone: _handleSocketDone,
        cancelOnError: true,
      );
    } catch (error) {
      _errorMessage = error.toString();
      _scheduleReconnect();
      notifyListeners();
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

      if (payload is! Map<String, dynamic>) {
        return;
      }

      if (!_eventController.isClosed) {
        _eventController.add(payload);
      }

      final type = payload['type']?.toString();
      if (type == 'notification') {
        final notificationId =
            payload['notification_id']?.toString() ??
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
      _errorMessage = error.toString();
      notifyListeners();
    }
  }

  void _handleSocketError(Object error) {
    _isConnected = false;
    _errorMessage = error.toString();
    notifyListeners();
    _scheduleReconnect();
  }

  void _handleSocketDone() {
    _isConnected = false;
    notifyListeners();
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    final accessToken = _accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      return;
    }

    _reconnectTimer = Timer(const Duration(seconds: 10), () {
      if (_accessToken != null && _accessToken!.isNotEmpty) {
        unawaited(_connectLiveFeed());
      }
    });
  }

  void _mergeNotifications(List<AppNotification> items) {
    for (final item in items) {
      if (_notificationIds.contains(item.id)) {
        final index = _notifications.indexWhere(
          (notification) => notification.id == item.id,
        );
        if (index != -1) {
          _notifications[index] = item;
        }
        continue;
      }

      _notificationIds.add(item.id);
      _notifications.add(item);
    }

    _notifications.sort((a, b) {
      final aTime = a.sentAt ?? a.createdAt;
      final bTime = b.sentAt ?? b.createdAt;
      return bTime.compareTo(aTime);
    });
  }

  void _addNotification(AppNotification notification) {
    if (_notificationIds.contains(notification.id)) {
      return;
    }

    _notificationIds.add(notification.id);
    _notifications.insert(0, notification);
    notifyListeners();
  }

  void _clearSessionState() {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _socketSubscription?.cancel();
    _socketSubscription = null;
    _socket?.close();
    _socket = null;
    _isConnected = false;
    _isConnecting = false;
    _notifications.clear();
    _notificationIds.clear();
    _errorMessage = null;
    _isLoading = false;
  }

  @override
  void dispose() {
    _reconnectTimer?.cancel();
    _socketSubscription?.cancel();
    _socket?.close();
    _eventController.close();
    super.dispose();
  }
}
