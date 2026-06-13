import 'package:flutter/material.dart';
import '../models/article.dart';
import '../models/category.dart';
import '../data/mock_data.dart';

class NewsProvider with ChangeNotifier {
  final List<Article> _allArticles = MockData.allArticles;
  final List<NewsCategory> _categories = MockData.categories;
  final Set<String> _savedArticleIds = {};
  
  String _searchQuery = '';

  List<Article> get allArticles => _allArticles;
  List<NewsCategory> get categories => _categories;

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

  void toggleSave(String id) {
    if (_savedArticleIds.contains(id)) {
      _savedArticleIds.remove(id);
    } else {
      _savedArticleIds.add(id);
    }
    notifyListeners();
  }

  void search(String query) {
    _searchQuery = query;
    notifyListeners();
  }
}
