class Article {
  final String id;
  final String title;
  final String category;
  final String source;
  final String imageUrl;
  final String timeAgo;
  final String content;

  Article({
    required this.id,
    required this.title,
    required this.category,
    required this.source,
    required this.imageUrl,
    required this.timeAgo,
    this.content = 'No content available.',
  });
}
