class Reel {
  const Reel({
    required this.id,
    required this.youtubeVideoId,
    required this.title,
    required this.channelId,
    required this.channelName,
    required this.thumbnailUrl,
    required this.viewCount,
    required this.likeCount,
    required this.commentCount,
    required this.timeAgo,
    this.description,
    this.channelLogoUrl,
    this.isLiked = false,
    this.isBookmarked = false,
    this.categoryId,
    this.publishedAt,
    this.aspectRatio = '16:9',
  });

  final String id;
  final String youtubeVideoId;
  final String title;
  final String channelId;
  final String channelName;
  final String thumbnailUrl;
  final int viewCount;
  final int likeCount;
  final int commentCount;
  final String timeAgo;
  final String? description;
  final String? channelLogoUrl;
  final bool isLiked;
  final bool isBookmarked;
  final String? categoryId;
  final DateTime? publishedAt;
  final String aspectRatio;

  Reel copyWith({
    String? id,
    String? youtubeVideoId,
    String? title,
    String? channelId,
    String? channelName,
    String? thumbnailUrl,
    int? viewCount,
    int? likeCount,
    int? commentCount,
    String? timeAgo,
    String? description,
    String? channelLogoUrl,
    bool? isLiked,
    bool? isBookmarked,
    String? categoryId,
    DateTime? publishedAt,
    String? aspectRatio,
  }) {
    return Reel(
      id: id ?? this.id,
      youtubeVideoId: youtubeVideoId ?? this.youtubeVideoId,
      title: title ?? this.title,
      channelId: channelId ?? this.channelId,
      channelName: channelName ?? this.channelName,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      viewCount: viewCount ?? this.viewCount,
      likeCount: likeCount ?? this.likeCount,
      commentCount: commentCount ?? this.commentCount,
      timeAgo: timeAgo ?? this.timeAgo,
      description: description ?? this.description,
      channelLogoUrl: channelLogoUrl ?? this.channelLogoUrl,
      isLiked: isLiked ?? this.isLiked,
      isBookmarked: isBookmarked ?? this.isBookmarked,
      categoryId: categoryId ?? this.categoryId,
      publishedAt: publishedAt ?? this.publishedAt,
      aspectRatio: aspectRatio ?? this.aspectRatio,
    );
  }

  factory Reel.fromJson(Map<String, dynamic> json) {
    final publishedAt = _dateValue(json['published_at'] ?? json['created_at']);
    return Reel(
      id: _stringValue(json['id']) ?? '',
      youtubeVideoId: _stringValue(json['youtube_video_id']) ?? '',
      title: _stringValue(json['title']) ?? 'Untitled Reel',
      channelId: _stringValue(json['channel_id']) ?? '',
      channelName: _stringValue(json['channel_name']) ?? 'Unknown Channel',
      thumbnailUrl: _stringValue(json['thumbnail_url']) ?? '',
      viewCount: _intValue(json['view_count']) ?? 0,
      likeCount: _intValue(json['like_count']) ?? 0,
      commentCount: _intValue(json['comment_count']) ?? 0,
      timeAgo: _formatTimeAgo(publishedAt),
      description: _stringValue(json['description']),
      channelLogoUrl: _stringValue(json['channel_logo_url']),
      isLiked: json['is_liked'] == true,
      isBookmarked: json['is_bookmarked'] == true,
      categoryId: _stringValue(json['category_id']),
      publishedAt: publishedAt,
      aspectRatio: _stringValue(json['aspect_ratio']) ?? '16:9',
    );
  }

  static String? _stringValue(dynamic value) {
    if (value == null) return null;
    final text = value.toString().trim();
    return text.isEmpty ? null : text;
  }

  static int? _intValue(dynamic value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '');
  }

  static DateTime? _dateValue(dynamic value) {
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  static String _formatTimeAgo(DateTime? value) {
    if (value == null) return '';
    final difference = DateTime.now().difference(value.toLocal());
    if (difference.isNegative || difference.inSeconds < 60) return 'Just now';
    if (difference.inMinutes < 60) return '${difference.inMinutes}m ago';
    if (difference.inHours < 24) return '${difference.inHours}h ago';
    return '${difference.inDays}d ago';
  }
}
