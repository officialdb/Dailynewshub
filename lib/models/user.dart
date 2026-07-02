class User {
  final String id;
  final String name;
  final String email;
  final DateTime registeredAt;
  final String? profileImageUrl;
  final String? accessToken;
  final String? refreshToken;

  String get firstName {
    final parts = name.trim().split(RegExp(r'\s+'));
    return parts.isEmpty ? '' : parts.first;
  }

  String get lastName {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length <= 1) {
      return '';
    }
    return parts.sublist(1).join(' ');
  }

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.registeredAt,
    this.profileImageUrl,
    this.accessToken,
    this.refreshToken,
  });

  User copyWith({
    String? id,
    String? name,
    String? email,
    DateTime? registeredAt,
    String? profileImageUrl,
    String? accessToken,
    String? refreshToken,
  }) {
    return User(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      registeredAt: registeredAt ?? this.registeredAt,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'registeredAt': registeredAt.toIso8601String(),
      'profileImageUrl': profileImageUrl,
      'accessToken': accessToken,
      'refreshToken': refreshToken,
    };
  }

  factory User.fromJson(Map<String, dynamic> json) {
    final nameValue =
        (json['name'] ??
                [json['firstName'], json['lastName']]
                    .where(
                      (value) =>
                          value != null && value.toString().trim().isNotEmpty,
                    )
                    .join(' '))
            .toString()
            .trim();
    final createdAtValue =
        json['registeredAt'] ?? json['created_at'] ?? json['createdAt'];
    final parsedRegisteredAt = createdAtValue is String
        ? DateTime.tryParse(createdAtValue)
        : createdAtValue is DateTime
        ? createdAtValue
        : DateTime.now();

    return User(
      id: json['id']?.toString() ?? '',
      name: nameValue.isEmpty ? '' : nameValue,
      email: json['email']?.toString() ?? '',
      registeredAt: parsedRegisteredAt ?? DateTime.now(),
      profileImageUrl:
          json['profileImageUrl']?.toString() ??
          json['avatar_url']?.toString() ??
          json['avatarUrl']?.toString(),
      accessToken:
          json['accessToken']?.toString() ?? json['access_token']?.toString(),
      refreshToken:
          json['refreshToken']?.toString() ?? json['refresh_token']?.toString(),
    );
  }
}
