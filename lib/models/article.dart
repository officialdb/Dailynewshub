class Article {
  const Article({
    required this.id,
    required this.title,
    required this.category,
    required this.source,
    required this.imageUrl,
    required this.timeAgo,
    required this.content,
    this.categoryId,
    this.categorySlug,
    this.sourceName,
    this.sourceUrl,
    this.description,
    this.publishedAt,
    this.createdAt,
    this.updatedAt,
    this.isFeatured = false,
    this.isTrending = false,
    this.viewCount = 0,
    this.isBookmarked = false,
  });

  final String id;
  final String title;
  final String category;
  final String source;
  final String imageUrl;
  final String timeAgo;
  final String content;
  final String? categoryId;
  final String? categorySlug;
  final String? sourceName;
  final String? sourceUrl;
  final String? description;
  final DateTime? publishedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final bool isFeatured;
  final bool isTrending;
  final int viewCount;
  final bool isBookmarked;

  String get displayContent {
    final trimmedContent = content.trim();
    if (trimmedContent.isNotEmpty) {
      return trimmedContent;
    }

    final trimmedDescription = description?.trim() ?? '';
    if (trimmedDescription.isNotEmpty) {
      return trimmedDescription;
    }

    return 'No content available.';
  }

  Article copyWith({
    String? id,
    String? title,
    String? category,
    String? source,
    String? imageUrl,
    String? timeAgo,
    String? content,
    String? categoryId,
    String? categorySlug,
    String? sourceName,
    String? sourceUrl,
    String? description,
    DateTime? publishedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isFeatured,
    bool? isTrending,
    int? viewCount,
    bool? isBookmarked,
  }) {
    return Article(
      id: id ?? this.id,
      title: title ?? this.title,
      category: category ?? this.category,
      source: source ?? this.source,
      imageUrl: imageUrl ?? this.imageUrl,
      timeAgo: timeAgo ?? this.timeAgo,
      content: content ?? this.content,
      categoryId: categoryId ?? this.categoryId,
      categorySlug: categorySlug ?? this.categorySlug,
      sourceName: sourceName ?? this.sourceName,
      sourceUrl: sourceUrl ?? this.sourceUrl,
      description: description ?? this.description,
      publishedAt: publishedAt ?? this.publishedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isFeatured: isFeatured ?? this.isFeatured,
      isTrending: isTrending ?? this.isTrending,
      viewCount: viewCount ?? this.viewCount,
      isBookmarked: isBookmarked ?? this.isBookmarked,
    );
  }

  factory Article.fromJson(
    Map<String, dynamic> json, {
    String? categoryName,
    String? categorySlug,
  }) {
    final title = _stringValue(json['title']) ?? 'Untitled article';
    final description = _stringValue(json['description']);
    final content = _stringValue(json['content']) ?? description;
    final sourceUrl = _stringValue(json['source_url']);
    final sourceName = _stringValue(json['source_name']);
    final publishedAt = _dateValue(json['published_at']);
    final createdAt = _dateValue(json['created_at']);
    final updatedAt = _dateValue(json['updated_at']);

    return Article(
      id: _stringValue(json['id']) ?? '',
      title: title,
      category: categoryName ?? _stringValue(json['category']) ?? 'General',
      source: sourceName ?? _deriveSourceLabel(sourceUrl) ?? 'Daily News Hub',
      imageUrl: _stringValue(json['image_url']) ?? '',
      timeAgo: _formatTimeAgo(publishedAt ?? createdAt ?? updatedAt),
      content: content ?? 'No content available.',
      categoryId: _stringValue(json['category_id']),
      categorySlug: categorySlug,
      sourceName: sourceName,
      sourceUrl: sourceUrl,
      description: description,
      publishedAt: publishedAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      isFeatured: json['is_featured'] == true,
      isTrending: json['is_trending'] == true,
      viewCount: _intValue(json['view_count']) ?? 0,
    );
  }

  static String? _stringValue(dynamic value) {
    if (value == null) {
      return null;
    }
    final text = value.toString().trim();
    return text.isEmpty ? null : text;
  }

  static int? _intValue(dynamic value) {
    if (value is int) {
      return value;
    }
    return int.tryParse(value?.toString() ?? '');
  }

  static DateTime? _dateValue(dynamic value) {
    if (value is DateTime) {
      return value;
    }
    if (value is String) {
      return DateTime.tryParse(value);
    }
    return null;
  }

  static String? _deriveSourceLabel(String? sourceUrl) {
    if (sourceUrl == null || sourceUrl.isEmpty) {
      return null;
    }

    try {
      final uri = Uri.parse(sourceUrl);
      final host = uri.host.replaceFirst('www.', '');
      if (host.isEmpty) {
        return null;
      }
      final segments = host.split('.');
      return segments.length > 1 ? segments.first.toUpperCase() : host;
    } catch (_) {
      return null;
    }
  }

  static String _formatTimeAgo(DateTime? value) {
    if (value == null) {
      return '';
    }

    final difference = DateTime.now().difference(value.toLocal());
    if (difference.isNegative || difference.inSeconds < 60) {
      return 'Just now';
    }
    if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    }
    if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    }
    return '${difference.inDays}d ago';
  }
}
