import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'search_screen.dart';
import 'models/article.dart';
import 'providers/news_provider.dart';
import 'providers/auth_provider.dart';
import 'login_screen.dart';

class ArticleDetailScreen extends StatefulWidget {
  final Article article;

  const ArticleDetailScreen({super.key, required this.article});

  @override
  State<ArticleDetailScreen> createState() => _ArticleDetailScreenState();
}

class _ArticleDetailScreenState extends State<ArticleDetailScreen> {
  final GlobalKey _commentSectionKey = GlobalKey();

  @override
  Widget build(BuildContext context) {
    final newsProvider = Provider.of<NewsProvider>(context);
    final isSaved = newsProvider.isSaved(widget.article.id);

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
        widget.article.imageUrl,
        fit: BoxFit.cover,
        color: Colors.black.withValues(alpha: 0.3),
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
            color: Colors.black.withValues(alpha: 0.3),
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
              widget.article.category.toUpperCase(),
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
            widget.article.title,
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
                        widget.article.source,
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
                    widget.article.timeAgo,
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
                onTap: () => provider.toggleSave(widget.article.id),
              ),
              _buildActionButton(
                icon: Icons.share_outlined,
                label: 'SHARE',
                onTap: () async {
                  // ignore: deprecated_member_use
                  await Share.share('${widget.article.title}\n\nRead more on Daily News Hub');
                },
              ),
              _buildActionButton(
                icon: Icons.chat_bubble_outline,
                label: 'COMMENT',
                onTap: () {
                  if (_commentSectionKey.currentContext != null) {
                    Scrollable.ensureVisible(
                      _commentSectionKey.currentContext!,
                      duration: const Duration(milliseconds: 500),
                      curve: Curves.easeInOut,
                    );
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 40),
          // Article text
          Text(
            widget.article.content,
            style: GoogleFonts.inter(
              color: const Color(0xFFD1D5DB),
              fontSize: 18,
              height: 1.8,
            ),
          ),
          const SizedBox(height: 40),
          _buildCommentSection(context, provider),
        ],
      ),
    );
  }

  Widget _buildCommentSection(BuildContext context, NewsProvider provider) {
    final comments = provider.getCommentsForArticle(widget.article.id);
    final authProvider = Provider.of<AuthProvider>(context);
    
    return Column(
      key: _commentSectionKey,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Comments (${comments.length})',
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 24),
        if (authProvider.isRegistered)
          _buildCommentInput(context, provider, authProvider.userName)
        else
          Center(
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE23B3B),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              },
              child: Text(
                'Login to Comment',
                style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
          ),
        const SizedBox(height: 32),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: comments.length,
          itemBuilder: (context, index) {
            final comment = comments[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF2A2E4C),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          comment.userName,
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          _formatTime(comment.timestamp),
                          style: GoogleFonts.inter(
                            color: const Color(0xFF6B7280),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      comment.text,
                      style: GoogleFonts.inter(
                        color: const Color(0xFFD1D5DB),
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildCommentInput(BuildContext context, NewsProvider provider, String userName) {
    final TextEditingController commentController = TextEditingController();

    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: commentController,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Add a comment as $userName...',
              hintStyle: const TextStyle(color: Color(0xFF6B7280)),
              filled: true,
              fillColor: const Color(0xFF2A2E4C),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          icon: const Icon(Icons.send, color: Color(0xFFE23B3B)),
          onPressed: () {
            if (commentController.text.trim().isNotEmpty) {
              provider.addComment(widget.article.id, commentController.text.trim(), userName);
              commentController.clear();
            }
          },
        ),
        IconButton(
          icon: const Icon(Icons.logout, color: Color(0xFF6B7280)),
          tooltip: 'Logout',
          onPressed: () {
            Provider.of<AuthProvider>(context, listen: false).logout();
          },
        ),
      ],
    );
  }

  String _formatTime(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
    return 'Just now';
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
