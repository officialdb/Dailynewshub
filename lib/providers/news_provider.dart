import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/article.dart';
import '../models/category.dart';
import '../models/comment.dart';
import '../data/mock_data.dart';

class NewsProvider with ChangeNotifier {
  final List<Article> _allArticles = MockData.allArticles;
  final List<NewsCategory> _categories = MockData.categories;
  Set<String> _savedArticleIds = {};
  final List<Comment> _comments = List.from(MockData.initialComments);
  
  bool _isLoading = false;
  String _searchQuery = '';

  bool get isLoading => _isLoading;

  NewsProvider() {
    _initFetch();
  }

  Future<void> _initFetch() async {
    _isLoading = true;
    notifyListeners();
    await Future.delayed(const Duration(milliseconds: 1500));
    final prefs = await SharedPreferences.getInstance();
    final savedList = prefs.getStringList('savedArticles') ?? [];
    _savedArticleIds = savedList.toSet();

    _isLoading = false;
    notifyListeners();
  }

  List<Article> get allArticles => _allArticles;
  List<NewsCategory> get categories => _categories;

  List<Comment> getCommentsForArticle(String articleId) {
    var filtered = _comments.where((c) => c.articleId == articleId).toList();
    filtered.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return filtered;
  }

  void addComment(String articleId, String text, String userName) {
    _comments.add(Comment(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      articleId: articleId,
      userName: userName,
      text: text,
      timestamp: DateTime.now(),
    ));
    notifyListeners();
  }

  List<Article> get savedArticles {
    return _allArticles.where((a) => _savedArticleIds.contains(a.id)).toList();
  }

  List<Article> get searchResults {
    if (_searchQuery.isEmpty) return [];
    return _allArticles.where((a) => 
      a.title.toLowerCase().contains(_searchQuery.toLowerCase()) || 
      a.category.toLowerCase().contains(_searchQuery.toLowerCase())
    ).toList();
  }

  bool isSaved(String id) {
    return _savedArticleIds.contains(id);
  }

  Future<void> toggleSave(String id) async {
    if (_savedArticleIds.contains(id)) {
      _savedArticleIds.remove(id);
    } else {
      _savedArticleIds.add(id);
    }
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('savedArticles', _savedArticleIds.toList());
  }

  Future<void> search(String query) async {
    _searchQuery = query;
    _isLoading = true;
    notifyListeners();
    
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 1000));
    
    _isLoading = false;
    notifyListeners();
  }
}
