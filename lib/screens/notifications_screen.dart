import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'article_detail_screen.dart';
import '../models/article.dart';
import 'login_screen.dart';
import '../providers/auth_provider.dart';
import '../providers/notification_provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      context.read<NotificationProvider>().refreshNotifications(force: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final notificationProvider = context.watch<NotificationProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('NOTIFICATIONS'), centerTitle: true),
      body: authProvider.isRegistered
          ? RefreshIndicator(
              onRefresh: () => context
                  .read<NotificationProvider>()
                  .refreshNotifications(force: true),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Inbox',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        notificationProvider.isConnected ? 'Live' : 'Offline',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: notificationProvider.isConnected
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(
                                  context,
                                ).colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (notificationProvider.isLoading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  if (!notificationProvider.isLoading &&
                      notificationProvider.notifications.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 72),
                      child: Center(
                        child: Text(
                          'No notifications yet.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                    )
                  else
                    ...notificationProvider.notifications.map(
                      (notification) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          onTap: () {
                            final articleId = notification.articleId;
                            if (articleId == null || articleId.isEmpty) {
                              return;
                            }
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ArticleDetailScreen(
                                  article: Article(
                                    id: articleId,
                                    title:
                                        notification.articleTitle ??
                                        notification.title,
                                    category: 'General',
                                    source: 'Daily News Hub',
                                    imageUrl: '',
                                    timeAgo: '',
                                    content: notification.body,
                                    description: notification.body,
                                  ),
                                ),
                              ),
                            );
                          },
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Theme.of(
                                context,
                              ).colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        notification.title,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(
                                              fontWeight: FontWeight.bold,
                                            ),
                                      ),
                                    ),
                                    Text(
                                      _formatTime(
                                        notification.sentAt ??
                                            notification.createdAt,
                                      ),
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
                                  notification.body,
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                                if ((notification.articleTitle ?? '')
                                    .isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    notification.articleTitle!,
                                    style: Theme.of(context).textTheme.bodySmall
                                        ?.copyWith(
                                          color: Theme.of(
                                            context,
                                          ).colorScheme.primary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            )
          : Center(
              child: ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                  );
                },
                child: const Text('Login to view notifications'),
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
}
