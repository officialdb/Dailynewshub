class Channel {
  const Channel({
    required this.id,
    required this.name,
    this.logoUrl,
    required this.isFollowed,
  });

  final String id;
  final String name;
  final String? logoUrl;
  final bool isFollowed;

  Channel copyWith({
    String? id,
    String? name,
    String? logoUrl,
    bool? isFollowed,
  }) {
    return Channel(
      id: id ?? this.id,
      name: name ?? this.name,
      logoUrl: logoUrl ?? this.logoUrl,
      isFollowed: isFollowed ?? this.isFollowed,
    );
  }

  factory Channel.fromJson(Map<String, dynamic> json) {
    return Channel(
      id: json['channel_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['channel_name']?.toString() ?? json['name']?.toString() ?? 'Unknown',
      logoUrl: json['channel_logo_url']?.toString() ?? json['logo_url']?.toString(),
      isFollowed: json['is_followed'] == true || json['id'] != null, // Usually from followed_channels endpoint
    );
  }
}
