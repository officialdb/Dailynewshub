class ReelComment {
  final String id;
  final String reelId;
  final String? parentId;
  final String userId;
  final String userName;
  final String? userAvatarUrl;
  final String text;
  final int likeCount;
  final bool isLiked;
  final DateTime timestamp;
  final List<ReelComment> replies;

  ReelComment({
    required this.id,
    required this.reelId,
    this.parentId,
    required this.userId,
    required this.userName,
    this.userAvatarUrl,
    required this.text,
    this.likeCount = 0,
    this.isLiked = false,
    required this.timestamp,
    this.replies = const [],
  });

  factory ReelComment.fromJson(Map<String, dynamic> json) {
    final ts = json['created_at']?.toString();
    final repliesJson = json['replies'] as List? ?? [];
    return ReelComment(
      id: json['id']?.toString() ?? '',
      reelId: json['reel_id']?.toString() ?? '',
      parentId: json['parent_id']?.toString(),
      userId: json['user_id']?.toString() ?? '',
      userName: json['user_name']?.toString() ?? 'Unknown',
      userAvatarUrl: json['user_avatar_url']?.toString(),
      text: json['body']?.toString() ?? '',
      likeCount: (json['like_count'] as num?)?.toInt() ?? 0,
      isLiked: json['is_liked'] as bool? ?? false,
      timestamp: ts != null ? DateTime.tryParse(ts) ?? DateTime.now() : DateTime.now(),
      replies: repliesJson.map((r) => ReelComment.fromJson(r as Map<String, dynamic>)).toList(),
    );
  }

  ReelComment copyWith({
    int? likeCount,
    bool? isLiked,
    List<ReelComment>? replies,
  }) {
    return ReelComment(
      id: id,
      reelId: reelId,
      parentId: parentId,
      userId: userId,
      userName: userName,
      userAvatarUrl: userAvatarUrl,
      text: text,
      likeCount: likeCount ?? this.likeCount,
      isLiked: isLiked ?? this.isLiked,
      timestamp: timestamp,
      replies: replies ?? this.replies,
    );
  }
}
