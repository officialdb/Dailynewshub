class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    this.articleId,
    this.articleTitle,
    this.sentAt,
  });

  final String id;
  final String title;
  final String body;
  final String? articleId;
  final String? articleTitle;
  final DateTime createdAt;
  final DateTime? sentAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    final createdAtValue =
        json['created_at']?.toString() ?? json['createdAt']?.toString();
    final sentAtValue =
        json['sent_at']?.toString() ?? json['sentAt']?.toString();

    return AppNotification(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Notification',
      body: json['body']?.toString() ?? '',
      articleId: json['article_id']?.toString(),
      articleTitle: json['article_title']?.toString(),
      createdAt: createdAtValue != null
          ? DateTime.tryParse(createdAtValue) ?? DateTime.now()
          : DateTime.now(),
      sentAt: sentAtValue != null ? DateTime.tryParse(sentAtValue) : null,
    );
  }

  AppNotification copyWith({
    String? id,
    String? title,
    String? body,
    String? articleId,
    String? articleTitle,
    DateTime? createdAt,
    DateTime? sentAt,
  }) {
    return AppNotification(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      articleId: articleId ?? this.articleId,
      articleTitle: articleTitle ?? this.articleTitle,
      createdAt: createdAt ?? this.createdAt,
      sentAt: sentAt ?? this.sentAt,
    );
  }
}
