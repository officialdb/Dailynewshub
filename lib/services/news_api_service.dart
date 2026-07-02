import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/article.dart';
import '../models/category.dart';
import '../models/comment.dart';
import '../models/app_notification.dart';

class NewsApiException implements Exception {
  NewsApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'NewsApiException($statusCode): $message';
}

class ArticlePage {
  ArticlePage({
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
    required this.pages,
  });

  final List<Article> items;
  final int total;
  final int page;
  final int limit;
  final int pages;
}

class NewsApiService {
  NewsApiService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Uri _uri(String path, [Map<String, String>? queryParameters]) {
    return Uri.parse(
      '${ApiConfig.baseUrl}$path',
    ).replace(queryParameters: queryParameters);
  }

  Map<String, String> _headers({String? token}) {
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Map<String, dynamic> _decodeJson(http.Response response) {
    try {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      throw NewsApiException(
        'Unexpected response format',
        statusCode: response.statusCode,
      );
    } on FormatException catch (error) {
      throw NewsApiException(
        'Invalid JSON from backend: ${error.message}',
        statusCode: response.statusCode,
      );
    }
  }

  void _ensureSuccess(http.Response response, Map<String, dynamic> decoded) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return;
    }

    throw NewsApiException(
      decoded['detail']?.toString() ??
          decoded['message']?.toString() ??
          'Request failed',
      statusCode: response.statusCode,
    );
  }

  List<dynamic> _extractList(Map<String, dynamic> decoded) {
    final data = decoded['data'];
    if (data is List) {
      return data;
    }
    if (data is Map<String, dynamic> && data['items'] is List) {
      return data['items'] as List;
    }
    throw NewsApiException('Malformed list response from backend');
  }

  Map<String, dynamic> _extractObject(Map<String, dynamic> decoded) {
    final data = decoded['data'];
    if (data is Map<String, dynamic>) {
      return data;
    }
    throw NewsApiException('Malformed object response from backend');
  }

  Future<List<NewsCategory>> fetchCategories() async {
    final response = await _client.get(
      _uri('/categories'),
      headers: _headers(),
    );
    final decoded = _decodeJson(response);
    _ensureSuccess(response, decoded);
    return _extractList(decoded)
        .whereType<Map<String, dynamic>>()
        .map(NewsCategory.fromJson)
        .toList(growable: false);
  }

  Future<ArticlePage> fetchArticles({
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _client.get(
      _uri('/articles', {'page': '$page', 'limit': '$limit'}),
      headers: _headers(),
    );
    final decoded = _decodeJson(response);
    _ensureSuccess(response, decoded);
    final data = decoded['data'];
    if (data is! Map<String, dynamic>) {
      throw NewsApiException('Malformed article response from backend');
    }

    final items = data['items'];
    if (items is! List) {
      throw NewsApiException('Malformed article list from backend');
    }

    final parsedItems = items
        .whereType<Map<String, dynamic>>()
        .map(Article.fromJson)
        .toList(growable: false);

    return ArticlePage(
      items: parsedItems,
      total: (data['total'] as num?)?.toInt() ?? parsedItems.length,
      page: (data['page'] as num?)?.toInt() ?? page,
      limit: (data['limit'] as num?)?.toInt() ?? limit,
      pages: (data['pages'] as num?)?.toInt() ?? 0,
    );
  }

  Future<List<Article>> fetchTrendingArticles({int limit = 10}) async {
    final response = await _client.get(
      _uri('/articles/trending', {'limit': '$limit'}),
      headers: _headers(),
    );
    final decoded = _decodeJson(response);
    _ensureSuccess(response, decoded);
    return _extractList(decoded)
        .whereType<Map<String, dynamic>>()
        .map(Article.fromJson)
        .toList(growable: false);
  }

  Future<List<Article>> searchArticles(String query) async {
    final response = await _client.get(
      _uri('/articles/search', {'q': query, 'page': '1', 'limit': '100'}),
      headers: _headers(),
    );
    final decoded = _decodeJson(response);
    _ensureSuccess(response, decoded);
    final data = decoded['data'];
    if (data is! Map<String, dynamic>) {
      throw NewsApiException('Malformed search response from backend');
    }

    final items = data['items'];
    if (items is! List) {
      throw NewsApiException('Malformed search results from backend');
    }

    return items
        .whereType<Map<String, dynamic>>()
        .map(Article.fromJson)
        .toList(growable: false);
  }

  Future<Set<String>> fetchBookmarkIds({required String accessToken}) async {
    final response = await _client.get(
      _uri('/bookmarks'),
      headers: _headers(token: accessToken),
    );
    final decoded = _decodeJson(response);
    _ensureSuccess(response, decoded);
    return _extractList(decoded)
        .whereType<Map<String, dynamic>>()
        .map((item) => item['article_id']?.toString())
        .whereType<String>()
        .where((value) => value.isNotEmpty)
        .toSet();
  }

  Future<List<Article>> fetchSavedArticles({required String accessToken}) async {
    final response = await _client.get(
      _uri('/bookmarks/articles'),
      headers: _headers(token: accessToken),
    );
    final decoded = _decodeJson(response);
    _ensureSuccess(response, decoded);
    return _extractList(decoded)
        .whereType<Map<String, dynamic>>()
        .map(Article.fromJson)
        .toList(growable: false);
  }

  Future<void> addBookmark({
    required String accessToken,
    required String articleId,
  }) async {
    final response = await _client.post(
      _uri('/bookmarks/$articleId'),
      headers: _headers(token: accessToken),
    );
    final decoded = _decodeJson(response);
    _ensureSuccess(response, decoded);
  }

  Future<void> removeBookmark({
    required String accessToken,
    required String articleId,
  }) async {
    final response = await _client.delete(
      _uri('/bookmarks/$articleId'),
      headers: _headers(token: accessToken),
    );
    final decoded = _decodeJson(response);
    _ensureSuccess(response, decoded);
  }

  Future<List<Comment>> fetchComments({required String articleId}) async {
    final response = await _client.get(
      _uri('/articles/$articleId/comments'),
      headers: _headers(),
    );
    final decoded = _decodeJson(response);
    _ensureSuccess(response, decoded);
    return _extractList(decoded)
        .whereType<Map<String, dynamic>>()
        .map(Comment.fromJson)
        .toList(growable: false);
  }

  Future<Comment> addComment({
    required String accessToken,
    required String articleId,
    required String body,
  }) async {
    final response = await _client.post(
      _uri('/articles/$articleId/comments'),
      headers: _headers(token: accessToken),
      body: jsonEncode({'body': body}),
    );
    final decoded = _decodeJson(response);
    _ensureSuccess(response, decoded);
    return Comment.fromJson(_extractObject(decoded));
  }

  Future<List<AppNotification>> fetchNotifications({
    required String accessToken,
    int limit = 20,
  }) async {
    final response = await _client.get(
      _uri('/users/me/notifications', {'limit': '$limit'}),
      headers: _headers(token: accessToken),
    );
    final decoded = _decodeJson(response);
    _ensureSuccess(response, decoded);
    return _extractList(decoded)
        .whereType<Map<String, dynamic>>()
        .map(AppNotification.fromJson)
        .toList(growable: false);
  }

  Future<void> registerDeviceToken({
    required String accessToken,
    required String fcmToken,
    String platform = 'android',
  }) async {
    final response = await _client.post(
      _uri('/users/device-token'),
      headers: _headers(token: accessToken),
      body: jsonEncode({'fcm_token': fcmToken, 'platform': platform}),
    );
    final decoded = _decodeJson(response);
    _ensureSuccess(response, decoded);
  }
}
