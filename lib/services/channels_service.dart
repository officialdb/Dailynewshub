import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';
import '../config/api_config.dart';
import '../models/channel.dart';

class ChannelsService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  ChannelsService({Dio? client}) {
    _client = client ?? Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
    _client.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'authAccessToken');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) {
          debugPrint('ChannelsService error: ${error.response?.statusCode} ${error.message}');
          return handler.next(error);
        },
      ),
    );
  }

  late final Dio _client;

  Options _options(String? token) {
    return Options(
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );
  }

  Future<List<Channel>> getChannels({String? token, int skip = 0, int limit = 50}) async {
    final response = await _client.get(
      '/channels/',
      queryParameters: {'skip': skip, 'limit': limit},
      options: _options(token),
    );
    final data = response.data['data'] as List;
    return data.map((json) => Channel.fromJson(json)).toList();
  }
  
  Future<List<Channel>> getFollowedChannels({String? token}) async {
    final response = await _client.get(
      '/channels/following',
      options: _options(token),
    );
    final data = response.data['data'] as List;
    return data.map((json) => Channel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<void> followChannel(String id, {String? token}) async {
    await _client.post(
      '/channels/$id/follow',
      options: _options(token),
    );
  }

  Future<void> unfollowChannel(String id, {String? token}) async {
    await _client.delete(
      '/channels/$id/follow',
      options: _options(token),
    );
  }
}
