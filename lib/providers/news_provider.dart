import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/article.dart';
import '../models/category.dart';
import '../models/comment.dart';
import '../services/news_api_service.dart';
import 'auth_provider.dart';
import 'notification_provider.dart';

class NewsProvider with ChangeNotifier {
  static const int _articlePageSize = 20;

  NewsProvider({NewsApiService? apiService})
    : _apiService = apiService ?? NewsApiService() {
    _bootstrap();
  }

  final NewsApiService _apiService;
  final Map<String, List<Comment>> _comments = {};

  String? _accessToken;
  bool _isBootstrapping = true;
  bool _isLoading = false;
  bool _isRefreshingContent = false;
  bool _isLoadingMoreArticles = false;
  bool _isRefreshingBookmarks = false;
  bool _hasLoadedSavedArticles = false;
  int _searchRequestCounter = 0;
  String? _errorMessage;

  List<Article> _allArticles = [];
  List<Article> _trendingArticles = [];
  List<Article> _searchResults = [];
  List<NewsCategory> _categories = [];
  Set<String> _savedArticleIds = {};
  List<Article> _savedArticles = [];
  int _loadedArticlePages = 0;
  int _totalArticlePages = 0;
  final Map<String, bool> _commentsLoading = {};
  NotificationProvider? _notificationProvider;
  StreamSubscription<Map<String, dynamic>>? _liveUpdateSubscription;
  bool _pendingLiveRefresh = false;

  bool get isLoading => _isLoading;

  bool get isLoadingMoreArticles => _isLoadingMoreArticles;

  bool get isBootstrapping => _isBootstrapping;

  String? get errorMessage => _errorMessage;

  List<Article> get allArticles => _allArticles;

  bool get hasMoreArticles =>
      _totalArticlePages > 0 && _loadedArticlePages < _totalArticlePages;

  bool get hasLoadedSavedArticles => _hasLoadedSavedArticles;

  List<Article> get trendingArticles => _trendingArticles.isNotEmpty
      ? _trendingArticles
      : _allArticles
            .where((article) => article.isTrending)
            .take(5)
            .toList(growable: false);

  List<NewsCategory> get categories => _categories;

  List<Comment> getCommentsForArticle(String articleId) {
    final comments = List<Comment>.from(_comments[articleId] ?? const []);
    comments.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return comments;
  }

  bool isCommentsLoading(String articleId) {
    return _commentsLoading[articleId] ?? false;
  }

  Future<void> loadComments(String articleId, {bool force = false}) async {
    if (_commentsLoading[articleId] == true ||
        (!force && _comments.containsKey(articleId))) {
      return;
    }

    _commentsLoading[articleId] = true;
    notifyListeners();

    try {
      final comments = await _apiService.fetchComments(articleId: articleId);
      _comments[articleId] = comments.toList(growable: true)
        ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    } catch (error) {
      _errorMessage = error.toString();
      _comments.putIfAbsent(articleId, () => <Comment>[]);
    } finally {
      _commentsLoading[articleId] = false;
      notifyListeners();
    }
  }

  Future<bool> addComment(String articleId, String text) async {
    final accessToken = _accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      return false;
    }
    try {
      final createdComment = await _apiService.addComment(
        accessToken: accessToken,
        articleId: articleId,
        body: text,
      );
      final comments = _comments.putIfAbsent(articleId, () => <Comment>[]);
      comments.insert(0, createdComment);
      notifyListeners();
      return true;
    } catch (error) {
      _errorMessage = error.toString();
      return false;
    }
  }

  List<Article> get savedArticles {
    if (_hasLoadedSavedArticles) {
      return List.unmodifiable(_savedArticles);
    }

    return _allArticles
        .where((article) => _savedArticleIds.contains(article.id))
        .toList(growable: false);
  }

  List<Article> get searchResults => _searchResults;

  bool isSaved(String id) {
    return _savedArticleIds.contains(id);
  }

  void setAuthProvider(AuthProvider authProvider) {
    final nextToken = authProvider.currentUser?.accessToken;
    final tokenChanged = nextToken != _accessToken;

    _accessToken = nextToken;

    if (tokenChanged) {
      if (_accessToken == null || _accessToken!.isEmpty) {
        _savedArticleIds = {};
        _savedArticles = [];
        _hasLoadedSavedArticles = true;
        _pendingLiveRefresh = false;
        notifyListeners();
      } else {
        unawaited(_loadSavedArticles());
      }
    }
  }

  void bindLiveUpdates(NotificationProvider notificationProvider) {
    if (identical(_notificationProvider, notificationProvider) &&
        _liveUpdateSubscription != null) {
      return;
    }

    _liveUpdateSubscription?.cancel();
    _notificationProvider = notificationProvider;

    if (_accessToken == null || _accessToken!.isEmpty) {
      return;
    }

    _liveUpdateSubscription = notificationProvider.events.listen(
      (payload) {
        final type = payload['type']?.toString();
        final title = payload['title']?.toString().toLowerCase() ?? '';
        final body = payload['body']?.toString().toLowerCase() ?? '';
        final isArticleUpdateNotification =
            type == 'notification' &&
            (title == 'new articles available' ||
                body.contains('new articles were added'));

        if (type == 'new_articles' || isArticleUpdateNotification) {
          if (_isRefreshingContent || _isLoadingMoreArticles) {
            _pendingLiveRefresh = true;
          } else {
            unawaited(refreshContent(silent: true));
          }
        }
      },
      onError: (error) {
        _errorMessage = error.toString();
        notifyListeners();
      },
    );
  }

  Future<void> refreshContent({bool silent = false}) async {
    if (_isRefreshingContent) {
      if (silent) {
        _pendingLiveRefresh = true;
      }
      return;
    }

    _isRefreshingContent = true;
    if (!silent) {
      _isLoading = true;
      notifyListeners();
    }

    _errorMessage = null;

    try {
      final results = await Future.wait([
        _apiService.fetchCategories(),
        _apiService.fetchTrendingArticles(limit: 5),
      ]);

      final categories = results[0] as List<NewsCategory>;
      final trending = results[1] as List<Article>;
      final categoryLookup = {
        for (final category in categories) category.id: category.title,
      };
      final articlePages = await _loadArticlePages(
        pageCount: _loadedArticlePages > 0 ? _loadedArticlePages : 1,
      );

      _categories = categories;
      _applyArticlePageState(articlePages, categoryLookup);

      _trendingArticles = trending
          .map(
            (article) => article.copyWith(
              category: categoryLookup[article.categoryId] ?? article.category,
            ),
          )
          .toList(growable: false);

      if (_accessToken != null && _accessToken!.isNotEmpty) {
        await _loadSavedArticles();
      } else {
        _savedArticleIds = {};
        _savedArticles = [];
        _hasLoadedSavedArticles = true;
      }
    } catch (error) {
      _errorMessage = error.toString();
      if (!silent) {
        _allArticles = [];
        _trendingArticles = [];
        _categories = [];
      }
    } finally {
      _isLoading = false;
      _isBootstrapping = false;
      _isRefreshingContent = false;
      notifyListeners();
      if (_pendingLiveRefresh) {
        _pendingLiveRefresh = false;
        unawaited(refreshContent(silent: true));
      }
    }
  }

  Future<void> _bootstrap() async {
    await refreshContent();
  }

  Future<List<ArticlePage>> _loadArticlePages({required int pageCount}) async {
    final requests = List.generate(
      pageCount,
      (index) => _apiService.fetchArticles(page: index + 1, limit: _articlePageSize),
    );
    return Future.wait(requests);
  }

  void _applyArticlePageState(
    List<ArticlePage> articlePages,
    Map<String, String> categoryLookup,
  ) {
    final seenIds = <String>{};
    final articles = <Article>[];

    var totalPages = 0;
    var loadedPages = 0;

    for (final page in articlePages) {
      totalPages = page.pages;
      loadedPages += 1;
      for (final article in page.items) {
        if (!seenIds.add(article.id)) {
          continue;
        }
        articles.add(
          article.copyWith(
            category: categoryLookup[article.categoryId] ?? article.category,
          ),
        );
      }
    }

    articles.sort((a, b) {
      final aTime =
          a.publishedAt ?? a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bTime =
          b.publishedAt ?? b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bTime.compareTo(aTime);
    });

    _allArticles = articles;
    _loadedArticlePages = loadedPages;
    _totalArticlePages = totalPages;
  }

  Future<void> _loadSavedArticles() async {
    final accessToken = _accessToken;
    if (accessToken == null || accessToken.isEmpty || _isRefreshingBookmarks) {
      return;
    }

    _isRefreshingBookmarks = true;
    try {
      final articles = await _apiService.fetchSavedArticles(
        accessToken: accessToken,
      );
      final categoryLookup = {
        for (final category in _categories) category.id: category.title,
      };
      _savedArticles = articles
          .map(
            (article) => article.copyWith(
              category: categoryLookup[article.categoryId] ?? article.category,
            ),
          )
          .toList(growable: false);
      _savedArticleIds = _savedArticles.map((article) => article.id).toSet();
      _hasLoadedSavedArticles = true;
      notifyListeners();
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isRefreshingBookmarks = false;
    }
  }

  Future<void> loadMoreArticles() async {
    if (_isLoadingMoreArticles || !hasMoreArticles) {
      return;
    }

    _isLoadingMoreArticles = true;
    notifyListeners();

    try {
      final nextPage = _loadedArticlePages + 1;
      final page = await _apiService.fetchArticles(
        page: nextPage,
        limit: _articlePageSize,
      );
      final categoryLookup = {
        for (final category in _categories) category.id: category.title,
      };
      final existingIds = _allArticles.map((article) => article.id).toSet();
      final appendedArticles = page.items
          .where((article) => !existingIds.contains(article.id))
          .map(
            (article) => article.copyWith(
              category: categoryLookup[article.categoryId] ?? article.category,
            ),
          )
          .toList(growable: false);

      _allArticles = [..._allArticles, ...appendedArticles];
      _loadedArticlePages = nextPage;
      _totalArticlePages = page.pages;
      notifyListeners();
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isLoadingMoreArticles = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _liveUpdateSubscription?.cancel();
    super.dispose();
  }

  Future<void> search(String query) async {
    final normalized = query.trim();

    if (normalized.isEmpty) {
      _searchResults = [];
      notifyListeners();
      return;
    }

    final requestId = ++_searchRequestCounter;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final results = await _apiService.searchArticles(normalized);
      if (requestId != _searchRequestCounter) {
        return;
      }

      final categoryLookup = {
        for (final category in _categories) category.id: category.title,
      };
      _searchResults = results
          .map(
            (article) => article.copyWith(
              category: categoryLookup[article.categoryId] ?? article.category,
            ),
          )
          .toList(growable: false);
    } catch (error) {
      if (requestId == _searchRequestCounter) {
        _errorMessage = error.toString();
        _searchResults = [];
      }
    } finally {
      if (requestId == _searchRequestCounter) {
        _isLoading = false;
        notifyListeners();
      }
    }
  }

  Future<bool> toggleSave(String articleId) async {
    final accessToken = _accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      return false;
    }

    try {
      if (_savedArticleIds.contains(articleId)) {
        await _apiService.removeBookmark(
          accessToken: accessToken,
          articleId: articleId,
        );
        _savedArticleIds.remove(articleId);
        _savedArticles.removeWhere((article) => article.id == articleId);
      } else {
        await _apiService.addBookmark(
          accessToken: accessToken,
          articleId: articleId,
        );
        _savedArticleIds.add(articleId);
        Article? bookmarkedArticle;
        try {
          bookmarkedArticle = _allArticles.firstWhere(
            (article) => article.id == articleId,
          );
        } catch (_) {
          bookmarkedArticle = null;
        }
        if (bookmarkedArticle != null) {
          _savedArticles.insert(0, bookmarkedArticle);
          _hasLoadedSavedArticles = true;
        }
      }
      notifyListeners();
      return true;
    } catch (error) {
      _errorMessage = error.toString();
      return false;
    }
  }
}
