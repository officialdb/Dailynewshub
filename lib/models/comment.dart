class Comment {
  final String id;
  final String articleId;
  final String userName;
  final String? userAvatarUrl;
  final String text;
  final DateTime timestamp;

  Comment({
    required this.id,
    required this.articleId,
    required this.userName,
    required this.text,
    required this.timestamp,
    this.userAvatarUrl,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    final timestampValue =
        json['created_at']?.toString() ?? json['createdAt']?.toString();

    return Comment(
      id: json['id']?.toString() ?? '',
      articleId: json['article_id']?.toString() ?? '',
      userName: json['user_name']?.toString() ?? '',
      userAvatarUrl: json['user_avatar_url']?.toString(),
      text: json['body']?.toString() ?? json['text']?.toString() ?? '',
      timestamp: timestampValue != null
          ? DateTime.tryParse(timestampValue) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
