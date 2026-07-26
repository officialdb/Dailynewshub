import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsState {
  final bool pushNotifications;
  final bool darkMode;
  final String language;
  final List<String> newsPreferences;
  final double fontSize;

  const SettingsState({
    this.pushNotifications = true,
    this.darkMode = false,
    this.language = 'English',
    this.newsPreferences = const ['Technology', 'Business', 'Economy'],
    this.fontSize = 15.0,
  });

  SettingsState copyWith({
    bool? pushNotifications,
    bool? darkMode,
    String? language,
    List<String>? newsPreferences,
    double? fontSize,
  }) {
    return SettingsState(
      pushNotifications: pushNotifications ?? this.pushNotifications,
      darkMode: darkMode ?? this.darkMode,
      language: language ?? this.language,
      newsPreferences: newsPreferences ?? this.newsPreferences,
      fontSize: fontSize ?? this.fontSize,
    );
  }
}

class SettingsNotifier extends Notifier<SettingsState> {
  @override
  SettingsState build() {
    _loadSettings();
    return const SettingsState();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    state = SettingsState(
      pushNotifications: prefs.getBool('pushNotifications') ?? true,
      darkMode: prefs.getBool('darkMode') ?? false,
      language: prefs.getString('language') ?? 'English',
      newsPreferences: prefs.getStringList('newsPreferences') ??
          ['Technology', 'Business', 'Economy'],
      fontSize: prefs.getDouble('fontSize') ?? 15.0,
    );
  }

  Future<void> togglePushNotifications() async {
    final newValue = !state.pushNotifications;
    state = state.copyWith(pushNotifications: newValue);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('pushNotifications', newValue);
  }

  Future<void> toggleDarkMode() async {
    final newValue = !state.darkMode;
    state = state.copyWith(darkMode: newValue);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('darkMode', newValue);
  }

  Future<void> setLanguage(String lang) async {
    state = state.copyWith(language: lang);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('language', lang);
  }

  Future<void> toggleNewsPreference(String category) async {
    final current = List<String>.from(state.newsPreferences);
    if (current.contains(category)) {
      current.remove(category);
    } else {
      current.add(category);
    }
    state = state.copyWith(newsPreferences: current);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('newsPreferences', current);
  }

  Future<void> setNewsPreferences(List<String> preferences) async {
    state = state.copyWith(newsPreferences: preferences);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('newsPreferences', preferences);
  }

  Future<void> setFontSize(double size) async {
    state = state.copyWith(fontSize: size);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('fontSize', size);
  }
}

final settingsProvider =
    NotifierProvider<SettingsNotifier, SettingsState>(SettingsNotifier.new);
