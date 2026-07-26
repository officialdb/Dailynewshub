import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';
import '../models/article.dart';

class OfflineService {
  static const _boxName = 'offline_articles';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox<String>(_boxName);
  }

  static Box<String> get _box => Hive.box<String>(_boxName);

  static Future<void> saveArticle(Article article) async {
    final json = jsonEncode({
      'id': article.id,
      'title': article.title,
      'category': article.category,
      'source': article.source,
      'imageUrl': article.imageUrl,
      'timeAgo': article.timeAgo,
      'content': article.content,
      'description': article.description,
      'sourceUrl': article.sourceUrl,
      'sourceName': article.sourceName,
      'categoryId': article.categoryId,
      'categorySlug': article.categorySlug,
      'publishedAt': article.publishedAt?.toIso8601String(),
      'isFeatured': article.isFeatured,
      'isTrending': article.isTrending,
      'viewCount': article.viewCount,
      'savedAt': DateTime.now().toIso8601String(),
    });
    await _box.put(article.id, json);
  }

  static Future<void> removeArticle(String articleId) async {
    await _box.delete(articleId);
  }

  static List<Article> getOfflineArticles() {
    return _box.values.map((json) {
      final data = jsonDecode(json) as Map<String, dynamic>;
      return Article.fromJson(data);
    }).toList();
  }

  static bool isOffline(String articleId) {
    return _box.containsKey(articleId);
  }

  static Future<void> clearOldArticles() async {
    final now = DateTime.now();
    final keysToDelete = <String>[];
    for (final key in _box.keys) {
      final json = _box.get(key.toString());
      if (json == null) continue;
      final data = jsonDecode(json) as Map<String, dynamic>;
      final publishedAt = data['publishedAt'] != null
          ? DateTime.tryParse(data['publishedAt'].toString())
          : null;
      if (publishedAt != null &&
          now.difference(publishedAt).inDays > 7) {
        keysToDelete.add(key.toString());
      }
    }
    await _box.deleteAll(keysToDelete);
  }
}
