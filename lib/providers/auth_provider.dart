import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  bool _isRegistered = false;
  User? _currentUser;
  List<User> _users = [];

  bool get isRegistered => _isRegistered;
  String get userName => _currentUser?.name ?? '';
  User? get currentUser => _currentUser;
  List<User> get users => _users;

  AuthProvider() {
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    final prefs = await SharedPreferences.getInstance();
    
    final usersJson = prefs.getStringList('users') ?? [];
    _users = usersJson.map((userStr) => User.fromJson(jsonDecode(userStr))).toList();

    final currentUserId = prefs.getString('currentUserId');
    if (currentUserId != null) {
      try {
        _currentUser = _users.firstWhere((u) => u.id == currentUserId);
        _isRegistered = true;
      } catch (e) {
        _currentUser = null;
        _isRegistered = false;
      }
    }
    notifyListeners();
  }

  Future<bool> register(String firstName, String lastName, String email, String password) async {
    if (_users.any((u) => u.email == email)) {
      return false; // Email already exists
    }

    final newUser = User(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password,
      registeredAt: DateTime.now(),
    );
    
    _users.add(newUser);
    _currentUser = newUser;
    _isRegistered = true;
    
    await _saveData();
    notifyListeners();
    return true;
  }

  Future<bool> login(String email, String password) async {
    try {
      final user = _users.firstWhere((u) => u.email == email && u.password == password);
      _currentUser = user;
      _isRegistered = true;
      
      await _saveData();
      notifyListeners();
      return true;
    } catch (e) {
      return false; // User not found or wrong password
    }
  }

  Future<void> updateProfile(String firstName, String lastName, String email, String password) async {
    if (_currentUser == null) return;
    
    final updatedUser = User(
      id: _currentUser!.id,
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password,
      registeredAt: _currentUser!.registeredAt,
    );
    
    final index = _users.indexWhere((u) => u.id == updatedUser.id);
    if (index != -1) {
      _users[index] = updatedUser;
    }
    _currentUser = updatedUser;
    
    await _saveData();
    notifyListeners();
  }

  Future<void> logout() async {
    _currentUser = null;
    _isRegistered = false;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('currentUserId');
    
    notifyListeners();
  }

  Future<void> _saveData() async {
    final prefs = await SharedPreferences.getInstance();
    final usersJson = _users.map((u) => jsonEncode(u.toJson())).toList();
    await prefs.setStringList('users', usersJson);
    if (_currentUser != null) {
      await prefs.setString('currentUserId', _currentUser!.id);
    }
  }
}
