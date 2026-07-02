import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/user.dart';
import '../services/auth_api_service.dart';

/// Central auth state backed by the Daily News Hub backend.
class AuthProvider with ChangeNotifier {
  static const String _accessTokenKey = 'authAccessToken';
  static const String _refreshTokenKey = 'authRefreshToken';
  static const String _legacyCurrentUserKey = 'currentUser';
  static const String _legacyCurrentUserIdKey = 'currentUserId';
  static const String _legacyUsersKey = 'users';

  final AuthApiService _apiService = AuthApiService();

  bool _isLoading = false;
  User? _currentUser;
  bool _isBootstrapping = true;

  /// Indicates whether an auth operation is currently in flight.
  bool get isLoading => _isLoading;

  /// Whether the current user session exists.
  bool get isRegistered => _currentUser != null;

  /// Display name for the current user.
  String get userName => _currentUser?.name ?? '';

  /// The active signed-in user.
  User? get currentUser => _currentUser;

  /// Cached users list, kept for compatibility with older screens.
  List<User> get users =>
      _currentUser == null ? const [] : List.unmodifiable([_currentUser!]);

  /// Whether the provider is restoring an existing backend session.
  bool get isBootstrapping => _isBootstrapping;

  /// Creates the provider and restores any saved session.
  AuthProvider() {
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final accessToken = prefs.getString(_accessTokenKey);
    final refreshToken = prefs.getString(_refreshTokenKey);

    if (accessToken != null && accessToken.isNotEmpty) {
      try {
        final user = await _apiService.getCurrentUser(accessToken: accessToken);
        _currentUser = user.copyWith(
          accessToken: accessToken,
          refreshToken: refreshToken,
        );
      } catch (_) {
        if (refreshToken != null && refreshToken.isNotEmpty) {
          try {
            final session = await _apiService.refreshToken(
              refreshToken: refreshToken,
            );
            await _saveSession(
              session.user,
              accessToken: session.accessToken,
              refreshToken: session.refreshToken,
            );
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
          refreshToken: refreshToken,
        );
        await _saveSession(
          session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        );
      } catch (_) {
        await _clearSession();
      }
    } else {
      await _clearSession();
    }

    _isBootstrapping = false;
    notifyListeners();
  }

  Future<void> _saveSession(
    User user, {
    required String accessToken,
    required String refreshToken,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessTokenKey, accessToken);
    await prefs.setString(_refreshTokenKey, refreshToken);
    _currentUser = user.copyWith(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }

  Future<void> _clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessTokenKey);
    await prefs.remove(_refreshTokenKey);
    await prefs.remove(_legacyCurrentUserKey);
    await prefs.remove(_legacyCurrentUserIdKey);
    await prefs.remove(_legacyUsersKey);
    _currentUser = null;
  }

  Future<void> _setLoading(bool value) async {
    _isLoading = value;
    notifyListeners();
  }

  Future<bool> register(
    String firstName,
    String lastName,
    String email,
    String password,
  ) async {
    await _setLoading(true);
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
      await _saveSession(
        user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      );
      notifyListeners();
      return true;
    } on AuthApiException {
      return false;
    } catch (_) {
      return false;
    } finally {
      await _setLoading(false);
    }
  }

  Future<bool> login(String email, String password) async {
    await _setLoading(true);
    try {
      final session = await _apiService.login(email: email, password: password);
      final user = session.user.copyWith(
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      );
      await _saveSession(
        user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      );
      notifyListeners();
      return true;
    } on AuthApiException {
      return false;
    } catch (_) {
      return false;
    } finally {
      await _setLoading(false);
    }
  }

  Future<void> updateProfile(
    String firstName,
    String lastName,
    String email, {
    String? password,
  }) async {
    if (_currentUser == null) {
      return;
    }

    final accessToken = _currentUser!.accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      return;
    }

    await _setLoading(true);
    try {
      final updatedUser = await _apiService.updateProfile(
        accessToken: accessToken,
        name: '$firstName $lastName'.trim(),
        email: email,
        password: password,
        avatarUrl: _currentUser!.profileImageUrl,
      );
      final mergedUser = updatedUser.copyWith(
        accessToken: _currentUser!.accessToken,
        refreshToken: _currentUser!.refreshToken,
        profileImageUrl: _currentUser!.profileImageUrl,
      );
      await _saveSession(
        mergedUser,
        accessToken: accessToken,
        refreshToken: _currentUser!.refreshToken ?? '',
      );
      notifyListeners();
    } finally {
      await _setLoading(false);
    }
  }

  Future<void> updateProfileImage(String imagePath) async {
    if (_currentUser == null) {
      return;
    }

    final accessToken = _currentUser!.accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      return;
    }

    final updatedUser = await _apiService.uploadAvatar(
      accessToken: accessToken,
      imagePath: imagePath,
    );
    await _saveSession(
      updatedUser,
      accessToken: accessToken,
      refreshToken: _currentUser!.refreshToken ?? '',
    );
    notifyListeners();
  }

  Future<void> logout() async {
    if (_currentUser?.accessToken != null &&
        _currentUser!.accessToken!.isNotEmpty) {
      try {
        await _apiService.logout(accessToken: _currentUser!.accessToken!);
      } catch (_) {
        // Clear local state even if the backend logout request fails.
      }
    }

    await _clearSession();
    notifyListeners();
  }
}
