class Reaction {
  const Reaction({
    required this.id,
    required this.articleId,
    required this.userId,
    required this.reactionType,
  });

  final String id;
  final String articleId;
  final String userId;
  final String reactionType;

  factory Reaction.fromJson(Map<String, dynamic> json) {
    return Reaction(
      id: json['id']?.toString() ?? '',
      articleId: json['article_id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      reactionType: json['reaction_type']?.toString() ?? 'like',
    );
  }
}
