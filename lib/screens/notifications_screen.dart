import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:cached_network_image/cached_network_image.dart';

import '../config/api_config.dart';
import '../models/article.dart';
import '../providers/auth_provider.dart';
import '../providers/news_provider.dart';
import '../providers/notification_provider.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  List<Map<String, dynamic>> _trendingArticles = [];
  List<Map<String, dynamic>> _commentActivity = [];
  bool _trendingLoading = true;
  bool _activityLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchTrending();
    _fetchCommentActivity();
    // Also refresh push notifications for authenticated users
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final isRegistered = ref.read(authProvider).isRegistered;
      if (isRegistered) {
        ref
            .read(notificationProvider.notifier)
            .refreshNotifications(force: true);
      }
    });
  }

  Future<void> _fetchTrending() async {
    setState(() => _trendingLoading = true);
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/articles/trending?limit=10'),
        headers: {'Accept': 'application/json'},
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final items = data['data'] as List?;
        if (items != null && mounted) {
          setState(() {
            _trendingArticles = items.cast<Map<String, dynamic>>();
          });
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _trendingLoading = false);
  }

  Future<void> _fetchCommentActivity() async {
    final token = ref.read(authProvider).user?.accessToken;
    if (token == null || token.isEmpty) return;

    setState(() => _activityLoading = true);
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/users/me/comment-activity?limit=20'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final items = data['data'] as List?;
        if (items != null && mounted) {
          setState(() {
            _commentActivity = items.cast<Map<String, dynamic>>();
          });
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _activityLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final isRegistered = ref.watch(authProvider).isRegistered;
    final notifState = ref.watch(notificationProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('NOTIFICATIONS'),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          _fetchTrending();
          _fetchCommentActivity();
          if (isRegistered) {
            await ref
                .read(notificationProvider.notifier)
                .refreshNotifications(force: true);
          }
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Trending Articles (for ALL users) ──
            _buildSectionHeader(context, 'Trending Now', Icons.trending_up),
            const SizedBox(height: 12),
            if (_trendingLoading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_trendingArticles.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Center(
                  child: Text(
                    'No trending articles right now.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              )
            else
              ..._trendingArticles.take(5).map(
                    (article) => _buildTrendingCard(context, article),
                  ),

            // ── Comment Activity (authenticated only) ──
            if (isRegistered) ...[
              const SizedBox(height: 32),
              _buildSectionHeader(
                  context, 'Comment Activity', Icons.forum_outlined),
              const SizedBox(height: 12),
              if (_activityLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_commentActivity.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Center(
                    child: Text(
                      'No activity on your comments yet.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                )
              else
                ..._commentActivity.map(
                  (activity) =>
                      _buildActivityCard(context, activity),
                ),

              // ── Push Notification Inbox ──
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildSectionHeader(context, 'Inbox', Icons.notifications_outlined),
                  if (notifState.notifications.isNotEmpty)
                    TextButton.icon(
                      onPressed: () {
                        ref.read(notificationProvider.notifier).clearAll();
                      },
                      icon: Icon(Icons.delete_sweep,
                          color: Theme.of(context).colorScheme.primary,
                          size: 18),
                      label: Text(
                        'Clear all',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontSize: 13,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    notifState.isConnected ? '● Live' : '○ Offline',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: notifState.isConnected
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: 0.5),
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (notifState.isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (notifState.notifications.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Center(
                    child: Text(
                      'No push notifications yet.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                )
              else
                ...notifState.notifications.map(
                  (notification) =>
                      _buildNotificationCard(context, notification),
                ),
            ],
            const SizedBox(height: 96),
          ],
        ),
      ),
    );
  }

  // ── Section header ──
  Widget _buildSectionHeader(BuildContext context, String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: Theme.of(context).colorScheme.primary, size: 20),
        const SizedBox(width: 8),
        Text(
          title,
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  // ── Trending article card ──
  Widget _buildTrendingCard(
      BuildContext context, Map<String, dynamic> article) {
    final title = article['title']?.toString() ?? 'Untitled';
    final imageUrl = article['image_url']?.toString() ?? '';
    final source = article['source_name']?.toString() ?? '';
    final category = article['category']?.toString() ?? '';
    final articleId = article['id']?.toString() ?? '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () {
          // Build Article model and navigate
          final a = Article(
            id: articleId,
            title: title,
            category: category.isNotEmpty ? category : 'General',
            source: source.isNotEmpty ? source : 'Daily News Hub',
            imageUrl: imageUrl,
            timeAgo: '',
            content: article['content']?.toString() ?? '',
            description: article['description']?.toString() ?? '',
            categoryId: article['category_id']?.toString(),
            sourceUrl: article['source_url']?.toString(),
          );
          Navigator.pushNamed(context, '/article', arguments: a);
        },
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              // Image
              Container(
                width: 80,
                height: 80,
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  color: Colors.black12,
                ),
                child: imageUrl.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imageUrl,
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) =>
                            const Icon(Icons.image, color: Colors.grey),
                      )
                    : const Icon(Icons.article, color: Colors.grey, size: 32),
              ),
              const SizedBox(width: 12),
              // Text
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (category.isNotEmpty)
                      Container(
                        margin: const EdgeInsets.only(bottom: 4),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Theme.of(context)
                              .colorScheme
                              .primary
                              .withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          category.toUpperCase(),
                          style: GoogleFonts.inter(
                            color: Theme.of(context).colorScheme.primary,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    Text(
                      title,
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600, height: 1.3),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (source.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        source,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: 0.5),
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Comment activity card (like or reply) ──
  Widget _buildActivityCard(
      BuildContext context, Map<String, dynamic> activity) {
    final type = activity['type']?.toString() ?? '';
    final userName = activity['user_name']?.toString() ?? 'Someone';
    final avatarUrl = activity['user_avatar_url']?.toString();
    final commentBody = activity['comment_body']?.toString() ?? '';
    final replyBody = activity['reply_body']?.toString();
    final articleId = activity['article_id']?.toString() ?? '';
    final articleTitle = activity['article_title']?.toString() ?? '';
    final createdAt = activity['created_at']?.toString() ?? '';

    final isReply = type == 'reply';
    final icon = isReply ? Icons.reply : Icons.favorite;
    final iconColor =
        isReply ? Colors.blue : Theme.of(context).colorScheme.primary;
    final message = isReply
        ? '$userName replied to your comment'
        : '$userName liked your comment';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: articleId.isNotEmpty
            ? () {
                final a = Article(
                  id: articleId,
                  title: articleTitle,
                  category: 'General',
                  source: 'Daily News Hub',
                  imageUrl: '',
                  timeAgo: '',
                  content: '',
                  description: '',
                );
                Navigator.pushNamed(context, '/article', arguments: a);
              }
            : null,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar
              CircleAvatar(
                radius: 18,
                backgroundColor: iconColor.withValues(alpha: 0.15),
                backgroundImage: (avatarUrl != null && avatarUrl.isNotEmpty)
                    ? CachedNetworkImageProvider(avatarUrl)
                    : null,
                child: (avatarUrl == null || avatarUrl.isEmpty)
                    ? Icon(icon, color: iconColor, size: 18)
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      message,
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    // Original comment snippet
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(6),
                        border: Border(
                          left: BorderSide(
                            color: iconColor.withValues(alpha: 0.4),
                            width: 3,
                          ),
                        ),
                      ),
                      child: Text(
                        commentBody,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: 0.7),
                            ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    // Reply body
                    if (isReply && replyBody != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        replyBody,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (articleTitle.isNotEmpty)
                          Expanded(
                            child: Text(
                              articleTitle,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color:
                                        Theme.of(context).colorScheme.primary,
                                    fontWeight: FontWeight.w500,
                                  ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        Text(
                          _formatTimestamp(createdAt),
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurface
                                    .withValues(alpha: 0.4),
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

  // ── Push notification card ──
  Widget _buildNotificationCard(
      BuildContext context, dynamic notification) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          final articleId = notification.articleId;
          if (articleId == null || articleId.isEmpty) return;
          Navigator.pushNamed(
            context,
            '/article',
            arguments: Article(
              id: articleId,
              title: notification.articleTitle ?? notification.title,
              category: 'General',
              source: 'Daily News Hub',
              imageUrl: '',
              timeAgo: '',
              content: notification.body,
              description: notification.body,
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      notification.title,
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                  Text(
                    _formatTime(notification.sentAt ?? notification.createdAt),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withValues(alpha: 0.5),
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                notification.body,
                style: Theme.of(context).textTheme.bodyMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
    return 'Just now';
  }

  String _formatTimestamp(String iso) {
    if (iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso);
      return _formatTime(dt.toLocal());
    } catch (_) {
      return '';
    }
  }
}
