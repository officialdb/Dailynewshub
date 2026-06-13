import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import 'article_detail_screen.dart';
import 'search_screen.dart';
import 'providers/news_provider.dart';
import 'models/article.dart';
import 'models/category.dart';
import 'widgets/app_drawer.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ScrollController _trendingScrollController = ScrollController();
  Timer? _trendingTimer;
  String _selectedCategory = 'All';

  @override
  void initState() {
    super.initState();
    _startTrendingAutoScroll();
  }

  void _startTrendingAutoScroll() {
    _trendingTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (_trendingScrollController.hasClients) {
        final double maxScroll = _trendingScrollController.position.maxScrollExtent;
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
    final allCategories = newsProvider.categories;
    final allArticles = newsProvider.allArticles;

    // We can simulate trending as the first 5
    final trendingArticles = allArticles.take(5).toList();
    
    // Filter articles by selected category
    List<Article> displayArticles = allArticles;
    if (_selectedCategory != 'All') {
      displayArticles = allArticles.where((a) => a.category.toUpperCase() == _selectedCategory.toUpperCase()).toList();
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0A0E21),
      drawer: const AppDrawer(),
      appBar: _buildAppBar(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 96),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildGreeting(),
            const SizedBox(height: 24),
            _buildTrendingSection(trendingArticles),
            const SizedBox(height: 24),
            _buildCategories(allCategories),
            const SizedBox(height: 16),
            _buildArticleList(displayArticles),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: const Color(0xFF0A0E21),
      elevation: 0,
      titleSpacing: 0,
      leading: Builder(
        builder: (context) {
          return IconButton(
            icon: const Icon(Icons.menu, color: Colors.white, size: 28),
            onPressed: () {
              Scaffold.of(context).openDrawer();
            },
          );
        }
      ),
      title: Text(
        'DAILY NEWS HUB',
        style: GoogleFonts.spaceGrotesk(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.w900,
          letterSpacing: -0.5,
        ),
      ),
      actions: [
        Stack(
          alignment: Alignment.center,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_none, color: Colors.white, size: 26),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('No new notifications')),
                );
              },
            ),
            Positioned(
              top: 12,
              right: 12,
              child: Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: const Color(0xFFE23B3B),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFF0A0E21), width: 1),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(width: 8),
        Container(
          width: 36,
          height: 36,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            image: DecorationImage(
              image: NetworkImage(
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuBUz43FWqB3AeunGrwLfQiOKaKVZwMYO4zIooL6K4_Kg2y9WCf-6cx_qbFZlabSCSmtn257e0VFCeNbXN7tVyWS4y9abVIGYQ1lMae03GO8ET7431hXG7z-fhcVI0ncM8JwP_oa-EjdkxCie9VYEjc04rqJ3ZbL0zq7mLNAgO2O8hw5XMHCZQrPJDHJ5QgNBGX9--1JU3dr8FTJj-5fCtuolJhRXl_SanGCItDl3UiXAbMUxBVBH-bfxc0yoDoXq1Q_ooMiX7AVlT4'),
              fit: BoxFit.cover,
            ),
          ),
        ),
        const SizedBox(width: 16),
      ],
    );
  }

  Widget _buildGreeting() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Good Morning, User 👋',
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontSize: 28,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Here is your daily briefing.',
          style: GoogleFonts.inter(
            color: const Color(0xFF6B7280),
            fontSize: 14,
            fontWeight: FontWeight.w400,
          ),
        ),
      ],
    );
  }

  Widget _buildTrendingSection(List<Article> articles) {
    return Column(
      children: [
        Row(
          children: [
            const Icon(Icons.local_fire_department, color: Color(0xFFE23B3B), size: 24),
            const SizedBox(width: 8),
            Text(
              'TRENDING NOW',
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 360,
          child: ListView.separated(
            controller: _trendingScrollController,
            scrollDirection: Axis.horizontal,
            itemCount: articles.length,
            separatorBuilder: (context, index) => const SizedBox(width: 16),
            itemBuilder: (context, index) {
              return _buildTrendingCard(articles[index]);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTrendingCard(Article article) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => ArticleDetailScreen(article: article)),
        );
      },
      child: Container(
        width: 280,
        decoration: BoxDecoration(
          color: const Color(0xFF1D2035),
          borderRadius: BorderRadius.circular(16),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              article.imageUrl,
              fit: BoxFit.cover,
              color: Colors.black.withOpacity(0.3),
              colorBlendMode: BlendMode.darken,
            ),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    const Color(0xFF0A0E21).withOpacity(0.9),
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
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE23B3B),
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
                            color: const Color(0xFFD1D5DB),
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
    );
  }

  Widget _buildCategories(List<NewsCategory> categories) {
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
                color: isSelected ? const Color(0xFFE23B3B) : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? const Color(0xFFE23B3B) : const Color(0xFF374151),
                ),
              ),
              child: Center(
                child: Text(
                  displayCat[index],
                  style: GoogleFonts.inter(
                    color: isSelected ? Colors.white : const Color(0xFF9CA3AF),
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

  Widget _buildArticleList(List<Article> articles) {
    if (articles.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Text(
            'No articles in this category.',
            style: GoogleFonts.inter(color: Colors.white),
          ),
        ),
      );
    }
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: articles.length,
      separatorBuilder: (context, index) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final article = articles[index];
        return _buildListArticleCard(article);
      },
    );
  }

  Widget _buildListArticleCard(Article article) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => ArticleDetailScreen(article: article)),
        );
      },
      child: Container(
        height: 120,
        decoration: BoxDecoration(
          color: const Color(0xFF1D2035),
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            SizedBox(
              width: 120,
              height: 120,
              child: Image.network(
                article.imageUrl,
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
                        color: const Color(0xFFE23B3B),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                    Text(
                      article.title,
                      style: GoogleFonts.spaceGrotesk(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        height: 1.2,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      article.source,
                      style: GoogleFonts.inter(
                        color: const Color(0xFF6B7280),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
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
    );
  }
}
