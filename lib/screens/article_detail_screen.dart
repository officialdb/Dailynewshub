import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:share_plus/share_plus.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../widgets/audio_player_sheet.dart';
import '../models/article.dart';
import '../providers/auth_provider.dart';
import '../providers/news_provider.dart';
import '../providers/settings_provider.dart';
import '../widgets/article_image.dart';
import '../widgets/profile_avatar.dart';

class ArticleDetailScreen extends ConsumerStatefulWidget {
  final Article article;

  const ArticleDetailScreen({super.key, required this.article});

  @override
  ConsumerState<ArticleDetailScreen> createState() =>
      _ArticleDetailScreenState();
}

class _ArticleDetailScreenState extends ConsumerState<ArticleDetailScreen> {
  final GlobalKey _commentSectionKey = GlobalKey();
  final TextEditingController _commentController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref
          .read(newsProvider.notifier)
          .loadComments(widget.article.id, force: true);
    });
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final newsState = ref.watch(newsProvider);
    final isSaved = newsState.savedArticleIds.contains(widget.article.id);
    final commentsLoading =
        newsState.commentsLoading[widget.article.id] ?? false;
    final fontSize = ref.watch(settingsProvider).fontSize;

    return Scaffold(
      appBar: _buildAppBar(context),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHeroSection(),
            _buildContentCard(
                context, isSaved, newsState, commentsLoading, fontSize),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      centerTitle: true,
      leading: IconButton(
        icon: Icon(
          Icons.arrow_back,
          color: Theme.of(context).iconTheme.color,
          size: 28,
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: const Text('DAILY NEWS HUB'),
      actions: [
        // Translate button (FIX 7)
        IconButton(
          icon: Icon(
            Icons.translate,
            color: Theme.of(context).iconTheme.color,
            size: 24,
          ),
          onPressed: () => _showLanguagePicker(context),
        ),
        // Listen button (FIX 19)
        IconButton(
          icon: Icon(
            Icons.headphones,
            color: Theme.of(context).iconTheme.color,
            size: 24,
          ),
          onPressed: () => _listenToArticle(context),
        ),
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
    );
  }

  Widget _buildHeroSection() {
    return SizedBox(
      height: 442,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          ArticleImage(
            imageUrl: widget.article.imageUrl,
            fit: BoxFit.cover,
            placeholderColor: Colors.black,
          ),
          Container(color: Colors.black.withValues(alpha: 0.3)),
        ],
      ),
    );
  }

  Widget _buildContentCard(
    BuildContext context,
    bool isSaved,
    NewsState newsState,
    bool commentsLoading,
    double fontSize,
  ) {
    return Container(
      transform: Matrix4.translationValues(0.0, -80.0, 0.0),
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).cardTheme.shadowColor ??
                Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary,
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
          Text(
            widget.article.title,
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontSize: 32, height: 1.1),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Icon(
                      Icons.person,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.6),
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.article.source,
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
              ),
              const SizedBox(width: 16),
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.6),
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    widget.article.timeAgo,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withValues(alpha: 0.6),
                        ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 32),
          Container(height: 1, color: Theme.of(context).dividerTheme.color),
          const SizedBox(height: 32),
          // Actions row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildActionButton(
                context,
                icon: isSaved ? Icons.bookmark : Icons.bookmark_border,
                label: isSaved ? 'SAVED' : 'SAVE',
                isActive: isSaved,
                onTap: () async {
                  final authState = ref.read(authProvider);
                  if (!authState.isRegistered) {
                    Navigator.pushNamed(context, '/login');
                    return;
                  }
                  final messenger = ScaffoldMessenger.of(context);
                  final success = await ref
                      .read(newsProvider.notifier)
                      .toggleSave(widget.article.id);
                  if (!success && mounted) {
                    messenger.showSnackBar(
                      const SnackBar(
                        content: Text('Could not update bookmark'),
                      ),
                    );
                  }
                },
              ),
              _buildActionButton(
                context,
                icon: Icons.share_outlined,
                label: 'SHARE',
                onTap: () => _shareArticle(widget.article),
              ),
              _buildActionButton(
                context,
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
          // Article text — SelectableText for highlight-to-share (FIX 10)
          SelectableText(
            widget.article.displayContent,
            style: Theme.of(context)
                .textTheme
                .bodyLarge
                ?.copyWith(height: 1.8, fontSize: fontSize),
            contextMenuBuilder: (context, editableTextState) {
              final selection =
                  editableTextState.textEditingValue.selection;
              final selectedText = selection.isValid && !selection.isCollapsed
                  ? editableTextState.textEditingValue.text
                      .substring(selection.start, selection.end)
                  : '';

              return AdaptiveTextSelectionToolbar.buttonItems(
                anchors: editableTextState.contextMenuAnchors,
                buttonItems: [
                  ContextMenuButtonItem(
                    label: 'Copy',
                    onPressed: () {
                      editableTextState
                          .copySelection(SelectionChangedCause.toolbar);
                      ContextMenuController.removeAny();
                    },
                  ),
                  if (selectedText.isNotEmpty)
                    ContextMenuButtonItem(
                      label: 'Share Quote',
                      onPressed: () {
                        ContextMenuController.removeAny();
                        _shareHighlight(selectedText);
                      },
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: 40),
          _buildCommentSection(context, newsState, commentsLoading),
        ],
      ),
    );
  }

  // FIX 11: Deep link share
  void _shareArticle(Article article) {
    final deepLink = 'https://dailynewshub.app/articles/${article.id}';
    final sourceUrl = article.sourceUrl ?? deepLink;
    final shareText =
        '${article.title}\n\n${article.description ?? ''}\n\nRead full article: $sourceUrl\n\nShared via Daily News Hub';
    SharePlus.instance.share(ShareParams(text: shareText, subject: article.title));
  }

  // FIX 10: Share highlighted text
  void _shareHighlight(String highlight) {
    final article = widget.article;
    final shareText =
        '"$highlight"\n\n— ${article.title}\n\nRead more: ${article.sourceUrl ?? 'https://dailynewshub.app/articles/${article.id}'}';
    SharePlus.instance.share(ShareParams(text: shareText));
  }

  // FIX 7: Language translation picker
  void _showLanguagePicker(BuildContext context) {
    final languages = {
      'French': 'fr',
      'Spanish': 'es',
      'Arabic': 'ar',
      'Yoruba': 'yo',
      'Igbo': 'ig',
      'Hausa': 'ha',
      'Portuguese': 'pt',
      'German': 'de',
    };

    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).cardTheme.color,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Translate Article',
              style: GoogleFonts.spaceGrotesk(
                color: Theme.of(context).textTheme.bodyLarge?.color,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
          Divider(
            color: Theme.of(context).dividerTheme.color,
            height: 1,
          ),
          ...languages.entries.map(
            (entry) => ListTile(
              title: Text(
                entry.key,
                style: GoogleFonts.poppins(
                  color: Theme.of(context).textTheme.bodyLarge?.color,
                ),
              ),
              onTap: () {
                Navigator.pop(sheetContext);
                _translateArticle(context, entry.value);
              },
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Future<void> _translateArticle(
      BuildContext context, String targetLang) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      const SnackBar(
        content: Text('Translating...'),
        duration: Duration(seconds: 2),
      ),
    );

    try {
      final uri = Uri.parse(
        '${ApiConfig.baseUrl}/articles/${widget.article.id}/translate?target_lang=$targetLang',
      );
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final translated = data['data'] as Map<String, dynamic>?;
        if (translated != null && context.mounted) {
          showDialog(
            context: context,
            builder: (dialogContext) => AlertDialog(
              title: Text(
                translated['title'] ?? widget.article.title,
                style: const TextStyle(fontSize: 18),
              ),
              content: SingleChildScrollView(
                child: Text(translated['content'] ?? ''),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Close'),
                ),
              ],
            ),
          );
        }
      } else {
        if (context.mounted) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Translation failed')),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text('Translation error: $e')),
        );
      }
    }
  }

  // FIX 19: Listen to article audio
  Future<void> _listenToArticle(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      const SnackBar(
        content: Text('Generating audio...'),
        duration: Duration(seconds: 2),
      ),
    );

    try {
      final token = ref.read(authProvider).user?.accessToken;
      final headers = <String, String>{
        'Accept': 'application/json',
      };
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      final uri = Uri.parse(
        '${ApiConfig.baseUrl}/articles/${widget.article.id}/audio',
      );
      final response = await http.get(uri, headers: headers);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final audioUrl = data['data']?['audio_url']?.toString();
        if (audioUrl != null && context.mounted) {
          showAudioPlayer(context, audioUrl, widget.article.title);
        } else {
          if (context.mounted) {
            messenger.showSnackBar(
              const SnackBar(content: Text('Audio not available')),
            );
          }
        }
      } else {
        if (context.mounted) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Failed to generate audio')),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text('Audio error: $e')),
        );
      }
    }
  }

  Widget _buildCommentSection(
    BuildContext context,
    NewsState newsState,
    bool commentsLoading,
  ) {
    final comments = List.from(
        newsState.comments[widget.article.id] ?? const <dynamic>[]);
    comments.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    final authState = ref.watch(authProvider);

    return Column(
      key: _commentSectionKey,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Comments (${comments.length})',
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(fontSize: 24),
        ),
        const SizedBox(height: 24),
        if (authState.isRegistered)
          _buildCommentInput(context, authState.userName)
        else
          Center(
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
              ),
              onPressed: () => Navigator.pushNamed(context, '/login'),
              child: Text(
                'Login to Comment',
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        const SizedBox(height: 32),
        if (commentsLoading)
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: CircularProgressIndicator(),
            ),
          ),
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
                  color: Theme.of(context)
                      .colorScheme
                      .surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ProfileAvatar(
                          imagePath: comment.userAvatarUrl,
                          size: 40,
                          placeholderIcon: Icons.person,
                          placeholderIconSize: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      comment.userName,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.bold,
                                          ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    _formatTime(comment.timestamp),
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.copyWith(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .onSurface
                                              .withValues(alpha: 0.6),
                                        ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                comment.text,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(height: 1.5),
                              ),
                            ],
                          ),
                        ),
                      ],
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

  Widget _buildCommentInput(BuildContext context, String userName) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _commentController,
            style: Theme.of(context).textTheme.bodyMedium,
            decoration: InputDecoration(
              hintText: 'Add a comment as $userName...',
              hintStyle: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.5),
                  ),
              filled: true,
              fillColor: Theme.of(context).inputDecorationTheme.fillColor,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          icon:
              Icon(Icons.send, color: Theme.of(context).colorScheme.primary),
          onPressed: () async {
            final text = _commentController.text.trim();
            if (text.isNotEmpty) {
              final messenger = ScaffoldMessenger.of(context);
              final success = await ref
                  .read(newsProvider.notifier)
                  .addComment(widget.article.id, text);
              if (!mounted) return;
              if (success) {
                _commentController.clear();
              } else {
                messenger.showSnackBar(
                  const SnackBar(content: Text('Could not post comment')),
                );
              }
            }
          },
        ),
        IconButton(
          icon: Icon(
            Icons.logout,
            color: Theme.of(context)
                .colorScheme
                .onSurface
                .withValues(alpha: 0.6),
          ),
          tooltip: 'Logout',
          onPressed: () => ref.read(authProvider.notifier).logout(),
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

  Widget _buildActionButton(
    BuildContext context, {
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
            color: isActive
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).iconTheme.color,
            size: 28,
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: GoogleFonts.spaceGrotesk(
              color: isActive
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.onSurface,
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
