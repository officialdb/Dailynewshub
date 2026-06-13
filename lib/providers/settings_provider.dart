import 'package:flutter/material.dart';

class SettingsProvider with ChangeNotifier {
  bool _pushNotifications = true;
  bool _darkMode = true; // default true since our design is dark

  bool get pushNotifications => _pushNotifications;
  bool get darkMode => _darkMode;

  void togglePushNotifications() {
    _pushNotifications = !_pushNotifications;
    notifyListeners();
  }

  void toggleDarkMode() {
    _darkMode = !_darkMode;
    notifyListeners();
  }
}
