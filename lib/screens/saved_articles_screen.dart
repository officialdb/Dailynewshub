import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../providers/auth_provider.dart';
import '../providers/news_provider.dart';
import '../models/article.dart';
import '../widgets/app_drawer.dart';
import '../widgets/article_image.dart';
import '../widgets/skeleton_loader.dart';

class SavedArticlesScreen extends ConsumerStatefulWidget {
  const SavedArticlesScreen({super.key});

  @override
  ConsumerState<SavedArticlesScreen> createState() =>
      _SavedArticlesScreenState();
}

class _SavedArticlesScreenState extends ConsumerState<SavedArticlesScreen> {
  List<Map<String, dynamic>> _savedReels = [];
  bool _reelsLoading = false;
  bool _reelsFetched = false;

  @override
  void initState() {
    super.initState();
    // Try fetching immediately in case auth is already loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _tryFetchReels();
    });
    // Listen for auth state changes — fetch reels when user logs in
    ref.listenManual(authProvider, (prev, next) {
      if (next.isRegistered && !_reelsFetched && !_reelsLoading) {
        _fetchSavedReels();
      }
    });
  }

  void _tryFetchReels() {
    final isRegistered = ref.read(authProvider).isRegistered;
    if (isRegistered && !_reelsFetched && !_reelsLoading) {
      _fetchSavedReels();
    }
  }

  Future<void> _fetchSavedReels() async {
    final token = ref.read(authProvider).user?.accessToken;
    if (token == null || token.isEmpty) return;
    _reelsFetched = true;

    setState(() => _reelsLoading = true);
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/bookmarks/reels?limit=50'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );
      if (response.statusCode == 200 && mounted) {
        final data = jsonDecode(response.body);
        final items = data['data']?['items'] as List?;
        if (items != null) {
          setState(() {
            _savedReels =
                items.cast<Map<String, dynamic>>();
          });
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _reelsLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final newsState = ref.watch(newsProvider);
    final authState = ref.watch(authProvider);
    final isRegistered = authState.isRegistered;
    final savedArticles = newsState.savedArticles;

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: _buildAppBar(context),
      body: RefreshIndicator(
        onRefresh: () async {
          _fetchSavedReels();
          await ref.read(newsProvider.notifier).refreshContent();
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(
            left: 16,
            right: 16,
            top: 24,
            bottom: 96,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(context, savedArticles.length),
              const SizedBox(height: 24),
              if (!isRegistered)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Column(
                      children: [
                        Text(
                          'Log in to save articles.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            Navigator.pushNamed(context, '/login');
                          },
                          child: const Text('LOGIN'),
                        ),
                      ],
                    ),
                  ),
                )
              else if (!newsState.hasLoadedSavedArticles)
                Column(
                  children: const [
                    ListArticleSkeletonCard(),
                    SizedBox(height: 16),
                    ListArticleSkeletonCard(),
                    SizedBox(height: 16),
                    ListArticleSkeletonCard(),
                  ],
                )
              else ...[
                // Saved Articles Section
                if (savedArticles.isNotEmpty) ...[
                  ...savedArticles.map(
                    (article) => Padding(
                      padding: const EdgeInsets.only(bottom: 24),
                      child: _buildArticleCard(context, ref, article),
                    ),
                  ),
                ],
                if (savedArticles.isEmpty && _savedReels.isEmpty && !_reelsLoading)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32.0),
                      child: Text(
                        'No saved items yet. Bookmark some!',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  ),

                // Saved Reels Section
                const SizedBox(height: 32),
                _buildSavedReelsSection(context),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSavedReelsSection(BuildContext context) {
    if (_reelsLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_savedReels.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: BoxDecoration(
            border: Border(
              bottom:
                  BorderSide(color: Theme.of(context).dividerTheme.color!),
            ),
          ),
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Icon(Icons.video_library,
                  color: Theme.of(context).colorScheme.primary, size: 20),
              const SizedBox(width: 8),
              Text(
                'SAVED REELS',
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontSize: 20),
              ),
              const SizedBox(width: 12),
              Text(
                '${_savedReels.length} saved',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ..._savedReels.map((reel) => _buildReelCard(context, reel)),
      ],
    );
  }

  Widget _buildReelCard(BuildContext context, Map<String, dynamic> reel) {
    final title = reel['title']?.toString() ?? 'Untitled Reel';
    final thumbnail = reel['thumbnail_url']?.toString() ?? '';
    final channel = reel['channel_name']?.toString() ?? '';
    final reelId = reel['id']?.toString() ?? '';

    return GestureDetector(
      onTap: () {
        // Navigate to reels screen to watch this reel
        Navigator.pushNamed(context, '/home', arguments: {
          'initialIndex': 1,
          'reelId': reelId,
        });
      },
      child: Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Thumbnail
              Container(
                width: 80,
                height: 100,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  color: Colors.black,
                ),
                child: thumbnail.isNotEmpty
                    ? Image.network(thumbnail, fit: BoxFit.cover)
                    : const Icon(Icons.play_circle_outline,
                        color: Colors.white54, size: 32),
              ),
              const SizedBox(width: 12),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontSize: 14, height: 1.3),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.person,
                            size: 14,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: 0.6)),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            channel,
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withValues(alpha: 0.6),
                                    ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // Remove bookmark
              GestureDetector(
                onTap: () async {
                  final token = ref.read(authProvider).user?.accessToken;
                  if (token == null) return;
                  try {
                    await http.delete(
                      Uri.parse(
                          '${ApiConfig.baseUrl}/bookmarks/reels/$reelId'),
                      headers: {
                        'Authorization': 'Bearer $token',
                        'Accept': 'application/json',
                      },
                    );
                    setState(() {
                      _savedReels
                          .removeWhere((r) => r['id']?.toString() == reelId);
                    });
                  } catch (_) {}
                },
                child: const Icon(
                  Icons.bookmark,
                  color: Color(0xFFFFD700),
                  size: 28,
                ),
              ),
            ],
          ),
        ),
      ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      centerTitle: true,
      title: const Text('DAILY NEWS HUB'),
      actions: [
        IconButton(
          icon: Icon(
            Icons.search,
            color: Theme.of(context).iconTheme.color,
            size: 28,
          ),
          onPressed: () => Navigator.pushNamed(context, '/search'),
        ),
        const SizedBox(width: 8),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1.0),
        child: Container(
          color: Theme.of(context).dividerTheme.color,
          height: 1.0,
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, int count) {
    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerTheme.color!),
        ),
      ),
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Expanded(
            child: Text(
              'MY SAVED ARTICLES',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontSize: 28),
            ),
          ),
          Text(
            '$count saved',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildArticleCard(
    BuildContext context,
    WidgetRef ref,
    Article article,
  ) {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(context, '/article', arguments: article);
      },
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      article.title,
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(fontSize: 18),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Container(
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          child: Text(
                            article.category.toUpperCase(),
                            style: GoogleFonts.inter(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.0,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            article.source,
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withValues(alpha: 0.6),
                                ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    width: 96,
                    height: 96,
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ArticleImage(
                      imageUrl: article.imageUrl,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: () async {
                      final success = await ref
                          .read(newsProvider.notifier)
                          .toggleSave(article.id);
                      if (!success && context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Could not update bookmark'),
                          ),
                        );
                      }
                    },
                    child: Icon(
                      Icons.bookmark,
                      color: Theme.of(context).colorScheme.primary,
                      size: 32,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
