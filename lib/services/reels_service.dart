import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';
import '../config/api_config.dart';
import '../models/reel.dart';
import '../models/reel_comment.dart';

class ReelsService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  ReelsService({Dio? client}) {
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
          debugPrint('ReelsService error: ${error.response?.statusCode} ${error.message}');
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

  Future<List<Reel>> getReels({String? token, int skip = 0, int limit = 20}) async {
    final response = await _client.get(
      '/reels/',
      queryParameters: {'skip': skip, 'limit': limit},
      options: _options(token),
    );
    final envelope = response.data['data'];
    final items = (envelope is Map ? envelope['items'] : envelope) as List;
    return items.map((json) => Reel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<Reel> getReel(String id, {String? token}) async {
    final response = await _client.get(
      '/reels/$id',
      options: _options(token),
    );
    return Reel.fromJson(response.data['data']);
  }

  Future<void> likeReel(String id, {String? token}) async {
    await _client.post('/reels/$id/like', options: _options(token));
  }

  Future<void> unlikeReel(String id, {String? token}) async {
    await _client.delete('/reels/$id/like', options: _options(token));
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  Future<List<ReelComment>> getReelComments(String reelId, {int page = 1, int limit = 50}) async {
    final response = await _client.get(
      '/reels/$reelId/comments',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = response.data['data'];
    final items = (data is Map ? data['items'] : data) as List? ?? [];
    return items.map((j) => ReelComment.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<ReelComment> addComment(String reelId, String content, {String? parentId}) async {
    final response = await _client.post(
      '/reels/$reelId/comments',
      data: {
        'body': content,
        if (parentId != null) 'parent_id': parentId,
      },
    );
    return ReelComment.fromJson(response.data['data']);
  }

  Future<Map<String, dynamic>> likeComment(String reelId, String commentId) async {
    final response = await _client.post('/reels/$reelId/comments/$commentId/like');
    return response.data['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> unlikeComment(String reelId, String commentId) async {
    final response = await _client.delete('/reels/$reelId/comments/$commentId/like');
    return response.data['data'] as Map<String, dynamic>;
  }
}
