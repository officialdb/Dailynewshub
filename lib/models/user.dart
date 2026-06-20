class User {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String password;
  final DateTime registeredAt;

  String get name => '$firstName $lastName';

  User({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.password,
    required this.registeredAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'password': password,
      'registeredAt': registeredAt.toIso8601String(),
    };
  }

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      firstName: json['firstName'] ?? json['name']?.split(' ').first ?? '',
      lastName: json['lastName'] ?? (json['name']?.split(' ').skip(1).join(' ') ?? ''),
      email: json['email'] ?? '',
      password: json['password'] ?? '',
      registeredAt: DateTime.parse(json['registeredAt']),
    );
  }
}
