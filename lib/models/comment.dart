class Comment {
  final String id;
  final String articleId;
  final String userName;
  final String text;
  final DateTime timestamp;

  Comment({
    required this.id,
    required this.articleId,
    required this.userName,
    required this.text,
    required this.timestamp,
  });
}
