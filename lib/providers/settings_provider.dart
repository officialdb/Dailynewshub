import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsProvider with ChangeNotifier {
  bool _pushNotifications = true;
  bool _darkMode = false; // default false (Light Theme)
  String _language = 'English';
  List<String> _newsPreferences = ['Technology', 'Business', 'Economy'];

  bool get pushNotifications => _pushNotifications;
  bool get darkMode => _darkMode;
  String get language => _language;
  List<String> get newsPreferences => _newsPreferences;

  SettingsProvider() {
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _pushNotifications = prefs.getBool('pushNotifications') ?? true;
    _darkMode = prefs.getBool('darkMode') ?? false;
    _language = prefs.getString('language') ?? 'English';
    _newsPreferences =
        prefs.getStringList('newsPreferences') ??
        ['Technology', 'Business', 'Economy'];
    notifyListeners();
  }

  Future<void> togglePushNotifications() async {
    _pushNotifications = !_pushNotifications;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('pushNotifications', _pushNotifications);
    notifyListeners();
  }

  Future<void> toggleDarkMode() async {
    _darkMode = !_darkMode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('darkMode', _darkMode);
    notifyListeners();
  }

  Future<void> setLanguage(String lang) async {
    _language = lang;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('language', _language);
    notifyListeners();
  }

  Future<void> toggleNewsPreference(String category) async {
    if (_newsPreferences.contains(category)) {
      _newsPreferences.remove(category);
    } else {
      _newsPreferences.add(category);
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('newsPreferences', _newsPreferences);
    notifyListeners();
  }
}
