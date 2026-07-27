import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/user.dart';
import '../services/auth_api_service.dart';
import '../services/news_api_service.dart';

class AuthState {
  final User? user;
  final bool isLoading;
  final bool isBootstrapping;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.isBootstrapping = true,
  });

  bool get isRegistered => user != null;
  String get userName => user?.name ?? '';

  AuthState copyWith({
    User? user,
    bool clearUser = false,
    bool? isLoading,
    bool? isBootstrapping,
  }) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      isLoading: isLoading ?? this.isLoading,
      isBootstrapping: isBootstrapping ?? this.isBootstrapping,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  static const String _accessTokenKey = 'authAccessToken';
  static const String _refreshTokenKey = 'authRefreshToken';
  static const String _legacyCurrentUserKey = 'currentUser';
  static const String _legacyCurrentUserIdKey = 'currentUserId';
  static const String _legacyUsersKey = 'users';

  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  final AuthApiService _apiService = AuthApiService();

  @override
  AuthState build() {
    // Defer session restore to after build() returns so state is initialized
    Future.microtask(_restoreSession);
    return const AuthState();
  }

  Future<void> _restoreSession() async {
    final accessToken = await _secureStorage.read(key: _accessTokenKey);
    final refreshToken = await _secureStorage.read(key: _refreshTokenKey);

    if (accessToken != null && accessToken.isNotEmpty) {
      try {
        final user = await _apiService.getCurrentUser(
            accessToken: accessToken);
        final fullUser = user.copyWith(
          accessToken: accessToken,
          refreshToken: refreshToken,
        );
        await _saveSession(fullUser,
            accessToken: accessToken, refreshToken: refreshToken ?? '');
      } catch (_) {
        if (refreshToken != null && refreshToken.isNotEmpty) {
          try {
            final session = await _apiService.refreshToken(
                refreshToken: refreshToken);
            await _saveSession(session.user,
                accessToken: session.accessToken,
                refreshToken: session.refreshToken);
          } catch (_) {
            await _clearSession();
          }
        } else {
          await _clearSession();
        }
      }
    } else if (refreshToken != null && refreshToken.isNotEmpty) {
      try {
        final session = await _apiService.refreshToken(
            refreshToken: refreshToken);
        await _saveSession(session.user,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken);
      } catch (_) {
        await _clearSession();
      }
    } else {
      await _clearSession();
    }

    state = state.copyWith(isBootstrapping: false);
  }

  Future<void> _saveSession(
    User user, {
    required String accessToken,
    required String refreshToken,
  }) async {
    await _secureStorage.write(key: _accessTokenKey, value: accessToken);
    await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
    state = state.copyWith(
      user: user.copyWith(
        accessToken: accessToken,
        refreshToken: refreshToken,
      ),
    );
    await _registerFcmToken(accessToken);
  }

  Future<void> _clearSession() async {
    await _secureStorage.delete(key: _accessTokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_legacyCurrentUserKey);
    await prefs.remove(_legacyCurrentUserIdKey);
    await prefs.remove(_legacyUsersKey);
    state = state.copyWith(clearUser: true);
  }

  Future<bool> register(
    String firstName,
    String lastName,
    String email,
    String password,
  ) async {
    state = state.copyWith(isLoading: true);
    try {
      final session = await _apiService.register(
        name: '$firstName $lastName'.trim(),
        email: email,
        password: password,
      );
      final user = session.user.copyWith(
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      );
      await _saveSession(user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken);
      return true;
    } on AuthApiException {
      return false;
    } catch (_) {
      return false;
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true);
    try {
      final session =
          await _apiService.login(email: email, password: password);
      final user = session.user.copyWith(
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      );
      await _saveSession(user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken);
      return true;
    } on AuthApiException {
      return false;
    } catch (_) {
      return false;
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> _registerFcmToken(String accessToken) async {
    try {
      if (Firebase.apps.isEmpty) return;
      final fcmToken = await FirebaseMessaging.instance.getToken();
      if (fcmToken != null && fcmToken.isNotEmpty) {
        final api = NewsApiService();
        await api.registerDeviceToken(
          accessToken: accessToken,
          fcmToken: fcmToken,
          platform: defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android',
        );
        debugPrint('FCM token registered: ${fcmToken.substring(0, 20)}...');
      }
    } catch (e) {
      debugPrint('FCM token registration failed: $e');
    }
  }

  Future<void> updateProfile(
    String firstName,
    String lastName,
    String email, {
    String? password,
  }) async {
    final currentUser = state.user;
    if (currentUser == null) return;

    final accessToken = currentUser.accessToken;
    if (accessToken == null || accessToken.isEmpty) return;

    state = state.copyWith(isLoading: true);
    try {
      final updatedUser = await _apiService.updateProfile(
        accessToken: accessToken,
        name: '$firstName $lastName'.trim(),
        email: email,
        password: password,
        avatarUrl: currentUser.profileImageUrl,
      );
      final mergedUser = updatedUser.copyWith(
        accessToken: currentUser.accessToken,
        refreshToken: currentUser.refreshToken,
        profileImageUrl: currentUser.profileImageUrl,
      );
      await _saveSession(mergedUser,
          accessToken: accessToken,
          refreshToken: currentUser.refreshToken ?? '');
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> updateProfileImage(String imagePath) async {
    final currentUser = state.user;
    if (currentUser == null) return;

    final accessToken = currentUser.accessToken;
    if (accessToken == null || accessToken.isEmpty) return;

    final updatedUser = await _apiService.uploadAvatar(
      accessToken: accessToken,
      imagePath: imagePath,
    );
    await _saveSession(updatedUser,
        accessToken: accessToken,
        refreshToken: currentUser.refreshToken ?? '');
  }

  Future<void> logout() async {
    final token = state.user?.accessToken;
    if (token != null && token.isNotEmpty) {
      try {
        await _apiService.logout(accessToken: token);
      } catch (_) {}
    }
    await _clearSession();
  }

  Future<void> forgotPassword(String email) async {
    await _apiService.forgotPassword(email: email);
  }
}

final authProvider =
    NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authProvider).user;
});
