import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'article_detail_screen.dart';
import '../providers/news_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/notification_provider.dart';
import '../models/article.dart';
import '../models/category.dart';
import '../widgets/app_drawer.dart';
import '../widgets/article_image.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/profile_avatar.dart';
import 'notifications_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ScrollController _trendingScrollController = ScrollController();
  Timer? _trendingTimer;
  String _selectedCategory = 'All';
  final Set<String> _prefetchedImageUrls = {};
  bool _prefetchInFlight = false;

  @override
  void initState() {
    super.initState();
    _startTrendingAutoScroll();
  }

  void _startTrendingAutoScroll() {
    _trendingTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (!mounted || !_trendingScrollController.hasClients) {
        return;
      }

      final double maxScroll =
          _trendingScrollController.position.maxScrollExtent;
      final double currentScroll = _trendingScrollController.offset;
      final double cardWidth = 296.0; // 280 width + 16 separator

      if (currentScroll >= maxScroll - 10) {
        _trendingScrollController.animateTo(
          0,
          duration: const Duration(milliseconds: 800),
          curve: Curves.fastOutSlowIn,
        );
      } else {
        _trendingScrollController.animateTo(
          currentScroll + cardWidth,
          duration: const Duration(milliseconds: 800),
          curve: Curves.fastOutSlowIn,
        );
      }
    });
  }

  @override
  void dispose() {
    _trendingTimer?.cancel();
    _trendingScrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final newsProvider = Provider.of<NewsProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final allCategories = newsProvider.categories;
    final allArticles = newsProvider.allArticles;

    final trendingArticles = newsProvider.trendingArticles;

    // Filter articles by selected category
    List<Article> displayArticles = allArticles;
    if (_selectedCategory != 'All') {
      displayArticles = allArticles
          .where(
            (a) => a.category.toUpperCase() == _selectedCategory.toUpperCase(),
          )
          .toList();
    }

    _prefetchArticleImages(context, [...trendingArticles, ...displayArticles]);

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: _buildAppBar(context),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 96),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildGreeting(context, authProvider),
            const SizedBox(height: 24),
            _buildTrendingSection(
              context,
              trendingArticles,
              newsProvider.isLoading,
            ),
            const SizedBox(height: 24),
            _buildCategories(context, allCategories),
            const SizedBox(height: 16),
            _buildArticleList(
              context,
              displayArticles,
              newsProvider.isLoading,
              newsProvider.hasMoreArticles,
              newsProvider.isLoadingMoreArticles,
              newsProvider.loadMoreArticles,
            ),
          ],
        ),
      ),
    );
  }

  void _prefetchArticleImages(BuildContext context, List<Article> articles) {
    if (_prefetchInFlight) {
      return;
    }

    final uniqueUrls = <String>{};
    final urlsToPrefetch = <String>[];

    for (final article in articles) {
      final value = article.imageUrl.trim();
      final uri = Uri.tryParse(value);
      final isNetworkImage =
          uri != null && (uri.scheme == 'http' || uri.scheme == 'https');
      if (!isNetworkImage ||
          value.isEmpty ||
          uniqueUrls.contains(value) ||
          _prefetchedImageUrls.contains(value)) {
        continue;
      }

      uniqueUrls.add(value);
      urlsToPrefetch.add(value);
      if (urlsToPrefetch.length >= 8) {
        break;
      }
    }

    if (urlsToPrefetch.isEmpty) {
      return;
    }

    _prefetchInFlight = true;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        for (final url in urlsToPrefetch) {
          if (!mounted) {
            return;
          }
          await precacheImage(CachedNetworkImageProvider(url), context);
          _prefetchedImageUrls.add(url);
        }
      } finally {
        _prefetchInFlight = false;
      }
    });
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      titleSpacing: 0,
      leading: Builder(
        builder: (context) {
          return IconButton(
            icon: Icon(
              Icons.menu,
              color: Theme.of(context).iconTheme.color,
              size: 28,
            ),
            onPressed: () {
              Scaffold.of(context).openDrawer();
            },
          );
        },
      ),
      title: const Text('DAILY NEWS HUB'),
      actions: [
        Consumer<NotificationProvider>(
          builder: (context, notificationProvider, child) {
            return Stack(
              alignment: Alignment.center,
              children: [
                IconButton(
                  icon: Icon(
                    Icons.notifications_none,
                    color: Theme.of(context).iconTheme.color,
                    size: 26,
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const NotificationsScreen(),
                      ),
                    );
                  },
                ),
                if (notificationProvider.unreadCount > 0)
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Container(
                      constraints: const BoxConstraints(
                        minWidth: 18,
                        minHeight: 18,
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Theme.of(context).scaffoldBackgroundColor,
                          width: 2,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        notificationProvider.unreadCount > 9
                            ? '9+'
                            : notificationProvider.unreadCount.toString(),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
        const SizedBox(width: 8),
        Consumer<AuthProvider>(
          builder: (context, authProvider, child) {
            return ProfileAvatar(
              imagePath: authProvider.currentUser?.profileImageUrl,
              size: 36,
              placeholderIcon: Icons.person,
              placeholderIconSize: 20,
            );
          },
        ),
        const SizedBox(width: 16),
      ],
    );
  }

  Widget _buildGreeting(BuildContext context, AuthProvider authProvider) {
    final firstName = authProvider.currentUser?.firstName ?? 'User';
    final greeting = _greetingLabel(DateTime.now());
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Good $greeting, $firstName 👋',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 28),
        ),
        const SizedBox(height: 4),
        Text(
          'Here is your daily briefing.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
      ],
    );
  }

  String _greetingLabel(DateTime now) {
    final hour = now.hour;
    if (hour < 12) {
      return 'Morning';
    }
    if (hour < 18) {
      return 'Afternoon';
    }
    return 'Evening';
  }

  Widget _buildTrendingSection(
    BuildContext context,
    List<Article> articles,
    bool isLoading,
  ) {
    return Column(
      children: [
        Row(
          children: [
            Icon(
              Icons.local_fire_department,
              color: Theme.of(context).colorScheme.primary,
              size: 24,
            ),
            const SizedBox(width: 8),
            Text(
              'TRENDING NOW',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontSize: 20),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 360,
          child: ListView.separated(
            controller: _trendingScrollController,
            scrollDirection: Axis.horizontal,
            itemCount: isLoading ? 3 : articles.length,
            separatorBuilder: (context, index) => const SizedBox(width: 16),
            itemBuilder: (context, index) {
              if (isLoading) return const TrendingSkeletonCard();
              return _buildTrendingCard(context, articles[index]);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTrendingCard(BuildContext context, Article article) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ArticleDetailScreen(article: article),
          ),
        );
      },
      child: SizedBox(
        width: 280,
        child: Card(
          margin: EdgeInsets.zero,
          child: Stack(
            fit: StackFit.expand,
            children: [
              ArticleImage(
                imageUrl: article.imageUrl,
                fit: BoxFit.cover,
                placeholderColor: Colors.black,
              ),
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.8),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        article.category.toUpperCase(),
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      article.title,
                      style: GoogleFonts.spaceGrotesk(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        height: 1.2,
                      ),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            article.source,
                            style: GoogleFonts.inter(
                              color: Colors.white70,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
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
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategories(BuildContext context, List<NewsCategory> categories) {
    List<String> displayCat = ['All', ...categories.map((c) => c.title)];
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: displayCat.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final isSelected = displayCat[index] == _selectedCategory;
          return GestureDetector(
            onTap: () {
              setState(() {
                _selectedCategory = displayCat[index];
              });
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Center(
                child: Text(
                  displayCat[index],
                  style: GoogleFonts.inter(
                    color: isSelected
                        ? Colors.white
                        : Theme.of(context).colorScheme.onSurface,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildArticleList(
    BuildContext context,
    List<Article> articles,
    bool isLoading,
    bool hasMoreArticles,
    bool isLoadingMoreArticles,
    Future<void> Function() loadMoreArticles,
  ) {
    if (isLoading) {
      return ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: 5,
        separatorBuilder: (context, index) => const SizedBox(height: 16),
        itemBuilder: (context, index) {
          return const ListArticleSkeletonCard();
        },
      );
    }
    if (articles.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Text(
            'No articles in this category.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      );
    }
    return Column(
      children: [
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: articles.length,
          separatorBuilder: (context, index) => const SizedBox(height: 16),
          itemBuilder: (context, index) {
            final article = articles[index];
            return _buildListArticleCard(context, article);
          },
        ),
        if (hasMoreArticles || isLoadingMoreArticles)
          Padding(
            padding: const EdgeInsets.only(top: 20),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: isLoadingMoreArticles || !hasMoreArticles
                    ? null
                    : () => loadMoreArticles(),
                icon: isLoadingMoreArticles
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.expand_more),
                label: Text(
                  isLoadingMoreArticles ? 'Loading more' : 'Load more articles',
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildListArticleCard(BuildContext context, Article article) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ArticleDetailScreen(article: article),
          ),
        );
      },
      child: Card(
        margin: EdgeInsets.zero,
        child: SizedBox(
          height: 120,
          child: Row(
            children: [
              SizedBox(
                width: 120,
                height: 120,
                child: ArticleImage(
                  imageUrl: article.imageUrl,
                  fit: BoxFit.cover,
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        article.category.toUpperCase(),
                        style: GoogleFonts.inter(
                          color: Theme.of(context).colorScheme.primary,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        article.title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontSize: 16,
                          height: 1.2,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        article.source,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
