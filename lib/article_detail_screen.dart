import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'search_screen.dart';
import 'models/article.dart';
import 'providers/news_provider.dart';

class ArticleDetailScreen extends StatelessWidget {
  final Article article;

  const ArticleDetailScreen({super.key, required this.article});

  @override
  Widget build(BuildContext context) {
    final newsProvider = Provider.of<NewsProvider>(context);
    final isSaved = newsProvider.isSaved(article.id);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0E21),
      appBar: _buildAppBar(context),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHeroSection(),
            _buildContentCard(context, isSaved, newsProvider),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: const Color(0xFF0A0E21),
      elevation: 0,
      centerTitle: true,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back, color: Colors.white, size: 28),
        onPressed: () => Navigator.pop(context),
      ),
      title: Text(
        'DAILY NEWS HUB',
        style: GoogleFonts.spaceGrotesk(
          color: Colors.white,
          fontSize: 24,
          fontWeight: FontWeight.w900,
          fontStyle: FontStyle.italic,
          letterSpacing: -1.0,
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.search, color: Colors.white, size: 28),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const SearchScreen()),
            );
          },
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  Widget _buildHeroSection() {
    return SizedBox(
      height: 442,
      width: double.infinity,
      child: Image.asset(
        article.imageUrl,
        fit: BoxFit.cover,
        color: Colors.black.withOpacity(0.3),
        colorBlendMode: BlendMode.darken,
      ),
    );
  }

  Widget _buildContentCard(BuildContext context, bool isSaved, NewsProvider provider) {
    return Container(
      transform: Matrix4.translationValues(0.0, -80.0, 0.0), // -mt-20
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      decoration: BoxDecoration(
        color: const Color(0xFF1D2035),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tag
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFE23B3B),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              article.category.toUpperCase(),
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.0,
              ),
            ),
          ),
          const SizedBox(height: 24),
          // Title
          Text(
            article.title,
            style: GoogleFonts.spaceGrotesk(
              color: Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.w900,
              height: 1.1,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 24),
          // Meta info
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.person, color: Color(0xFF6B7280), size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        article.source,
                        style: GoogleFonts.inter(
                          color: const Color(0xFF6B7280),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Row(
                children: [
                  const Icon(Icons.access_time, color: Color(0xFF6B7280), size: 16),
                  const SizedBox(width: 8),
                  Text(
                    article.timeAgo,
                    style: GoogleFonts.inter(
                      color: const Color(0xFF6B7280),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 32),
          // Divider
          Container(
            height: 2,
            color: const Color(0xFF2A2E4C),
          ),
          const SizedBox(height: 32),
          // Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildActionButton(
                icon: isSaved ? Icons.bookmark : Icons.bookmark_border,
                label: isSaved ? 'SAVED' : 'SAVE',
                isActive: isSaved,
                onTap: () => provider.toggleSave(article.id),
              ),
              _buildActionButton(
                icon: Icons.share_outlined,
                label: 'SHARE',
                onTap: () {},
              ),
              _buildActionButton(
                icon: Icons.chat_bubble_outline,
                label: 'COMMENT',
                onTap: () {},
              ),
            ],
          ),
          const SizedBox(height: 40),
          // Article text
          Text(
            article.content,
            style: GoogleFonts.inter(
              color: const Color(0xFFD1D5DB),
              fontSize: 18,
              height: 1.8,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    bool isActive = false,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Icon(
            icon,
            color: isActive ? const Color(0xFFE23B3B) : Colors.white,
            size: 28,
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: GoogleFonts.spaceGrotesk(
              color: isActive ? const Color(0xFFE23B3B) : Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.0,
            ),
          ),
        ],
      ),
    );
  }
}
