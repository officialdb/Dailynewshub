import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/article.dart';
import '../models/category.dart';
import '../models/comment.dart';
import '../services/news_api_service.dart';
import 'auth_provider.dart';
import 'notification_provider.dart';

class NewsState {
  final List<Article> allArticles;
  final List<Article> trendingArticles;
  final List<Article> searchResults;
  final List<NewsCategory> categories;
  final Set<String> savedArticleIds;
  final List<Article> savedArticles;
  final bool isLoading;
  final bool isLoadingMoreArticles;
  final bool isBootstrapping;
  final bool hasLoadedSavedArticles;
  final int loadedArticlePages;
  final int totalArticlePages;
  final Map<String, List<Comment>> comments;
  final Map<String, bool> commentsLoading;
  final String? errorMessage;

  const NewsState({
    this.allArticles = const [],
    this.trendingArticles = const [],
    this.searchResults = const [],
    this.categories = const [],
    this.savedArticleIds = const {},
    this.savedArticles = const [],
    this.isLoading = false,
    this.isLoadingMoreArticles = false,
    this.isBootstrapping = true,
    this.hasLoadedSavedArticles = false,
    this.loadedArticlePages = 0,
    this.totalArticlePages = 0,
    this.comments = const {},
    this.commentsLoading = const {},
    this.errorMessage,
  });

  bool get hasMoreArticles =>
      totalArticlePages > 0 && loadedArticlePages < totalArticlePages;

  NewsState copyWith({
    List<Article>? allArticles,
    List<Article>? trendingArticles,
    List<Article>? searchResults,
    List<NewsCategory>? categories,
    Set<String>? savedArticleIds,
    List<Article>? savedArticles,
    bool? isLoading,
    bool? isLoadingMoreArticles,
    bool? isBootstrapping,
    bool? hasLoadedSavedArticles,
    int? loadedArticlePages,
    int? totalArticlePages,
    Map<String, List<Comment>>? comments,
    Map<String, bool>? commentsLoading,
    String? errorMessage,
    bool clearError = false,
  }) {
    return NewsState(
      allArticles: allArticles ?? this.allArticles,
      trendingArticles: trendingArticles ?? this.trendingArticles,
      searchResults: searchResults ?? this.searchResults,
      categories: categories ?? this.categories,
      savedArticleIds: savedArticleIds ?? this.savedArticleIds,
      savedArticles: savedArticles ?? this.savedArticles,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMoreArticles:
          isLoadingMoreArticles ?? this.isLoadingMoreArticles,
      isBootstrapping: isBootstrapping ?? this.isBootstrapping,
      hasLoadedSavedArticles:
          hasLoadedSavedArticles ?? this.hasLoadedSavedArticles,
      loadedArticlePages: loadedArticlePages ?? this.loadedArticlePages,
      totalArticlePages: totalArticlePages ?? this.totalArticlePages,
      comments: comments ?? this.comments,
      commentsLoading: commentsLoading ?? this.commentsLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class NewsNotifier extends Notifier<NewsState> {
  late final NewsApiService _apiService;

  static const int _articlePageSize = 20;
  String? _accessToken;
  bool _isRefreshingContent = false;
  bool _isRefreshingBookmarks = false;
  int _searchRequestCounter = 0;
  bool _pendingLiveRefresh = false;
  StreamSubscription<Map<String, dynamic>>? _eventSubscription;

  @override
  NewsState build() {
    _apiService = NewsApiService();

    // React to auth changes
    ref.listen<AuthState>(authProvider, (prev, next) {
      final nextToken = next.user?.accessToken;
      final prevToken = prev?.user?.accessToken;
      if (nextToken != prevToken) {
        _onTokenChanged(nextToken);
      }
    });

    // Subscribe to notification events for live article updates
    _eventSubscription =
        ref.read(notificationProvider.notifier).events.listen((payload) {
      _handleNotificationEvent(payload);
    });

    // Bootstrap: load initial content
    final initialToken = ref.read(authProvider).user?.accessToken;
    if (initialToken != null) {
      _accessToken = initialToken;
    }
    // Defer bootstrap to after build() returns so state is initialized
    Future.microtask(_bootstrap);

    return const NewsState();
  }

  String? get _resolvedToken =>
      _accessToken ?? ref.read(authProvider).user?.accessToken;

  void _onTokenChanged(String? newToken) {
    _accessToken = newToken;
    if (newToken == null || newToken.isEmpty) {
      state = state.copyWith(
        savedArticleIds: <String>{},
        savedArticles: <Article>[],
        hasLoadedSavedArticles: true,
      );
      _pendingLiveRefresh = false;
    } else {
      unawaited(_loadSavedArticles());
    }
  }

  void _handleNotificationEvent(Map<String, dynamic> payload) {
    final type = payload['type']?.toString();
    final title = payload['title']?.toString().toLowerCase() ?? '';
    final body = payload['body']?.toString().toLowerCase() ?? '';
    final isArticleUpdate = type == 'notification' &&
        (title == 'new articles available' ||
            body.contains('new articles were added'));

    if (type == 'new_articles' || isArticleUpdate) {
      if (_isRefreshingContent || state.isLoadingMoreArticles) {
        _pendingLiveRefresh = true;
      } else {
        unawaited(refreshContent(silent: true));
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────

  List<Comment> getCommentsForArticle(String articleId) {
    final comments =
        List<Comment>.from(state.comments[articleId] ?? const []);
    comments.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return comments;
  }

  bool isCommentsLoading(String articleId) {
    return state.commentsLoading[articleId] ?? false;
  }

  bool isSaved(String id) => state.savedArticleIds.contains(id);

  Future<void> loadComments(String articleId, {bool force = false}) async {
    if (state.commentsLoading[articleId] == true ||
        (!force && state.comments.containsKey(articleId))) {
      return;
    }

    final updatedLoading = Map<String, bool>.from(state.commentsLoading);
    updatedLoading[articleId] = true;
    state = state.copyWith(commentsLoading: updatedLoading);

    try {
      final fetchedComments =
          await _apiService.fetchComments(articleId: articleId);
      final sorted = fetchedComments.toList(growable: true)
        ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
      final updatedComments =
          Map<String, List<Comment>>.from(state.comments);
      updatedComments[articleId] = sorted;
      state = state.copyWith(comments: updatedComments);
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      final updatedComments =
          Map<String, List<Comment>>.from(state.comments);
      updatedComments.putIfAbsent(articleId, () => <Comment>[]);
      state = state.copyWith(comments: updatedComments);
    } finally {
      final updatedLoading = Map<String, bool>.from(state.commentsLoading);
      updatedLoading[articleId] = false;
      state = state.copyWith(commentsLoading: updatedLoading);
    }
  }

  Future<bool> addComment(String articleId, String text) async {
    final token = _resolvedToken;
    if (token == null || token.isEmpty) return false;

    try {
      final createdComment = await _apiService.addComment(
        accessToken: token,
        articleId: articleId,
        body: text,
      );
      final updatedComments =
          Map<String, List<Comment>>.from(state.comments);
      final articleComments =
          updatedComments.putIfAbsent(articleId, () => <Comment>[]);
      articleComments.insert(0, createdComment);
      state = state.copyWith(comments: updatedComments);
      return true;
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      return false;
    }
  }

  Future<void> refreshContent({bool silent = false}) async {
    if (_isRefreshingContent) {
      if (silent) _pendingLiveRefresh = true;
      return;
    }

    _isRefreshingContent = true;
    if (!silent) {
      state = state.copyWith(isLoading: true, clearError: true);
    }

    try {
      final results = await Future.wait([
        _apiService.fetchCategories(),
        _apiService.fetchTrendingArticles(limit: 5),
      ]);

      final categories = results[0] as List<NewsCategory>;
      final trending = results[1] as List<Article>;
      final categoryLookup = {
        for (final c in categories) c.id: c.title,
      };

      final articlePages = await _loadArticlePages(
        pageCount:
            state.loadedArticlePages > 0 ? state.loadedArticlePages : 1,
        accessToken: _resolvedToken,
      );

      final articles = _flattenArticlePages(articlePages, categoryLookup);

      final enrichedTrending = trending
          .map((a) => a.copyWith(
              category: categoryLookup[a.categoryId] ?? a.category))
          .toList(growable: false);

      state = state.copyWith(
        categories: categories,
        allArticles: articles.items,
        loadedArticlePages: articles.loadedPages,
        totalArticlePages: articles.totalPages,
        trendingArticles: enrichedTrending,
      );

      final token = _resolvedToken;
      if (token != null && token.isNotEmpty) {
        await _loadSavedArticles();
      } else {
        state = state.copyWith(
          savedArticleIds: <String>{},
          savedArticles: <Article>[],
          hasLoadedSavedArticles: true,
        );
      }
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      if (!silent) {
        state = state.copyWith(
          allArticles: <Article>[],
          trendingArticles: <Article>[],
          categories: <NewsCategory>[],
        );
      }
    } finally {
      _isRefreshingContent = false;
      state = state.copyWith(
        isLoading: false,
        isBootstrapping: false,
      );
      if (_pendingLiveRefresh) {
        _pendingLiveRefresh = false;
        unawaited(refreshContent(silent: true));
      }
    }
  }

  Future<void> loadMoreArticles() async {
    if (state.isLoadingMoreArticles || !state.hasMoreArticles) return;

    state = state.copyWith(isLoadingMoreArticles: true);

    try {
      final nextPage = state.loadedArticlePages + 1;
      final page = await _apiService.fetchArticles(
        page: nextPage,
        limit: _articlePageSize,
        accessToken: _resolvedToken,
      );
      final categoryLookup = {
        for (final c in state.categories) c.id: c.title,
      };
      final existingIds = state.allArticles.map((a) => a.id).toSet();
      final newArticles = page.items
          .where((a) => !existingIds.contains(a.id))
          .map((a) => a.copyWith(
              category: categoryLookup[a.categoryId] ?? a.category))
          .toList(growable: false);

      state = state.copyWith(
        allArticles: [...state.allArticles, ...newArticles],
        loadedArticlePages: nextPage,
        totalArticlePages: page.pages,
      );
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
    } finally {
      state = state.copyWith(isLoadingMoreArticles: false);
    }
  }

  Future<void> search(String query) async {
    final normalized = query.trim();
    if (normalized.isEmpty) {
      state = state.copyWith(searchResults: <Article>[]);
      return;
    }

    final requestId = ++_searchRequestCounter;
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final results = await _apiService.searchArticles(normalized);
      if (requestId != _searchRequestCounter) return;

      final categoryLookup = {
        for (final c in state.categories) c.id: c.title,
      };
      final enriched = results
          .map((a) => a.copyWith(
              category: categoryLookup[a.categoryId] ?? a.category))
          .toList(growable: false);

      state = state.copyWith(searchResults: enriched);
    } catch (error) {
      if (requestId == _searchRequestCounter) {
        state = state.copyWith(
          errorMessage: error.toString(),
          searchResults: <Article>[],
        );
      }
    } finally {
      if (requestId == _searchRequestCounter) {
        state = state.copyWith(isLoading: false);
      }
    }
  }

  Future<bool> toggleSave(String articleId) async {
    final token = _resolvedToken;
    if (token == null || token.isEmpty) return false;

    try {
      final ids = Set<String>.from(state.savedArticleIds);
      final saved = List<Article>.from(state.savedArticles);

      if (ids.contains(articleId)) {
        await _apiService.removeBookmark(
            accessToken: token, articleId: articleId);
        ids.remove(articleId);
        saved.removeWhere((a) => a.id == articleId);
      } else {
        await _apiService.addBookmark(
            accessToken: token, articleId: articleId);
        ids.add(articleId);
        try {
          final article =
              state.allArticles.firstWhere((a) => a.id == articleId);
          saved.insert(0, article);
        } catch (_) {}
      }

      state = state.copyWith(
        savedArticleIds: ids,
        savedArticles: saved,
        hasLoadedSavedArticles: true,
      );
      return true;
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      return false;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  Future<void> _bootstrap() async {
    await refreshContent();
  }

  Future<List<ArticlePage>> _loadArticlePages({
    required int pageCount,
    String? accessToken,
  }) async {
    final requests = List.generate(
      pageCount,
      (i) => _apiService.fetchArticles(
        page: i + 1,
        limit: _articlePageSize,
        accessToken: accessToken,
      ),
    );
    return Future.wait(requests);
  }

  _FlattenedArticles _flattenArticlePages(
    List<ArticlePage> pages,
    Map<String, String> categoryLookup,
  ) {
    final seenIds = <String>{};
    final articles = <Article>[];
    var totalPages = 0;
    var loadedPages = 0;

    for (final page in pages) {
      totalPages = page.pages;
      loadedPages++;
      for (final article in page.items) {
        if (!seenIds.add(article.id)) continue;
        articles.add(article.copyWith(
          category: categoryLookup[article.categoryId] ?? article.category,
        ));
      }
    }

    articles.sort((a, b) {
      final aTime = a.publishedAt ??
          a.createdAt ??
          DateTime.fromMillisecondsSinceEpoch(0);
      final bTime = b.publishedAt ??
          b.createdAt ??
          DateTime.fromMillisecondsSinceEpoch(0);
      return bTime.compareTo(aTime);
    });

    return _FlattenedArticles(
      items: articles,
      loadedPages: loadedPages,
      totalPages: totalPages,
    );
  }

  Future<void> _loadSavedArticles() async {
    final token = _resolvedToken;
    if (token == null || token.isEmpty || _isRefreshingBookmarks) return;

    _isRefreshingBookmarks = true;
    try {
      final articles =
          await _apiService.fetchSavedArticles(accessToken: token);
      final categoryLookup = {
        for (final c in state.categories) c.id: c.title,
      };
      final enriched = articles
          .map((a) => a.copyWith(
              category: categoryLookup[a.categoryId] ?? a.category))
          .toList(growable: false);
      state = state.copyWith(
        savedArticles: enriched,
        savedArticleIds: enriched.map((a) => a.id).toSet(),
        hasLoadedSavedArticles: true,
      );
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
    } finally {
      _isRefreshingBookmarks = false;
    }
  }
}

class _FlattenedArticles {
  final List<Article> items;
  final int loadedPages;
  final int totalPages;

  const _FlattenedArticles({
    required this.items,
    required this.loadedPages,
    required this.totalPages,
  });
}

final newsProvider =
    NotifierProvider<NewsNotifier, NewsState>(NewsNotifier.new);
