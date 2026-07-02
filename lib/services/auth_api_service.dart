import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/user.dart';

/// Thrown when the backend returns an unexpected response or a non-success status.
class AuthApiException implements Exception {
  /// Creates a backend auth exception.
  AuthApiException(this.message, {this.statusCode});

  /// Human-readable error message.
  final String message;

  /// Optional HTTP status code.
  final int? statusCode;

  @override
  String toString() => 'AuthApiException($statusCode): $message';
}

/// Authentication payload returned by the backend.
class AuthSession {
  /// Creates a backend auth session.
  AuthSession({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });

  /// User returned by the backend.
  final User user;

  /// JWT access token.
  final String accessToken;

  /// JWT refresh token.
  final String refreshToken;
}

/// Small HTTP client for the Daily News Hub backend auth endpoints.
class AuthApiService {
  /// Creates an auth API client.
  AuthApiService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Uri _uri(String path) => Uri.parse('${ApiConfig.baseUrl}$path');

  Map<String, String> _headers({String? token}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  AuthSession _decodeAuthSession(Map<String, dynamic> data) {
    final userJson = data['user'] as Map<String, dynamic>?;
    final tokensJson = data['tokens'] as Map<String, dynamic>?;

    if (userJson == null || tokensJson == null) {
      throw AuthApiException('Malformed auth response from backend');
    }

    return AuthSession(
      user: User.fromJson(userJson),
      accessToken: tokensJson['access_token']?.toString() ?? '',
      refreshToken: tokensJson['refresh_token']?.toString() ?? '',
    );
  }

  Future<AuthSession> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final response = await _client.post(
      _uri('/auth/register'),
      headers: _headers(),
      body: jsonEncode({'name': name, 'email': email, 'password': password}),
    );

    return _decodeResponse(response);
  }

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    final response = await _client.post(
      _uri('/auth/login'),
      headers: _headers(),
      body: jsonEncode({'email': email, 'password': password}),
    );

    return _decodeResponse(response);
  }

  Future<AuthSession> refreshToken({required String refreshToken}) async {
    final response = await _client.post(
      _uri('/auth/refresh-token'),
      headers: _headers(),
      body: jsonEncode({'refresh_token': refreshToken}),
    );

    return _decodeResponse(response);
  }

  Future<User> getCurrentUser({required String accessToken}) async {
    final response = await _client.get(
      _uri('/users/me'),
      headers: _headers(token: accessToken),
    );

    final decoded = _decodeJson(response);
    final data = decoded['data'];
    if (data is Map<String, dynamic>) {
      return User.fromJson(data);
    }
    throw AuthApiException('Malformed user response from backend');
  }

  Future<void> logout({required String accessToken}) async {
    final response = await _client.post(
      _uri('/auth/logout'),
      headers: _headers(token: accessToken),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _exceptionFromResponse(response);
    }
  }

  Future<User> updateProfile({
    required String accessToken,
    required String name,
    required String email,
    String? password,
    String? avatarUrl,
  }) async {
    final payload = <String, dynamic>{'name': name, 'email': email};
    if (password != null && password.isNotEmpty) {
      payload['password'] = password;
    }
    if (avatarUrl != null && avatarUrl.isNotEmpty) {
      payload['avatar_url'] = avatarUrl;
    }

    final response = await _client.put(
      _uri('/users/me'),
      headers: _headers(token: accessToken),
      body: jsonEncode(payload),
    );

    final decoded = _decodeJson(response);
    final data = decoded['data'];
    if (data is Map<String, dynamic>) {
      return User.fromJson(data);
    }
    throw AuthApiException('Malformed profile response from backend');
  }

  Future<User> uploadAvatar({
    required String accessToken,
    required String imagePath,
  }) async {
    final request = http.MultipartRequest('POST', _uri('/users/me/avatar'));
    request.headers.addAll(
      _headers(token: accessToken)..remove('Content-Type'),
    );
    request.files.add(await http.MultipartFile.fromPath('file', imagePath));

    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    final decoded = _decodeJson(response);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(
        decoded['detail']?.toString() ??
            decoded['message']?.toString() ??
            'Request failed',
        statusCode: response.statusCode,
      );
    }

    final data = decoded['data'];
    if (data is Map<String, dynamic>) {
      return User.fromJson(data);
    }
    throw AuthApiException('Malformed avatar response from backend');
  }

  AuthSession _decodeResponse(http.Response response) {
    final decoded = _decodeJson(response);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(
        decoded['detail']?.toString() ??
            decoded['message']?.toString() ??
            'Request failed',
        statusCode: response.statusCode,
      );
    }

    final data = decoded['data'];
    if (data is Map<String, dynamic>) {
      return _decodeAuthSession(data);
    }
    throw AuthApiException('Malformed auth response from backend');
  }

  Map<String, dynamic> _decodeJson(http.Response response) {
    try {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      throw AuthApiException(
        'Unexpected response format',
        statusCode: response.statusCode,
      );
    } on FormatException catch (error) {
      throw AuthApiException(
        'Invalid JSON from backend: ${error.message}',
        statusCode: response.statusCode,
      );
    }
  }

  AuthApiException _exceptionFromResponse(http.Response response) {
    final decoded = _decodeJson(response);
    return AuthApiException(
      decoded['detail']?.toString() ??
          decoded['message']?.toString() ??
          'Request failed',
      statusCode: response.statusCode,
    );
  }
}
