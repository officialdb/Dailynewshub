import 'package:flutter/foundation.dart';

/// Resolves the backend API base URL for local development and emulator testing.
class ApiConfig {
  /// Optional override passed via `--dart-define=API_BASE_URL=...`.
  static const String environmentBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  /// Default backend base URL for local emulator testing.
  static String get baseUrl {
    if (environmentBaseUrl.isNotEmpty) {
      return environmentBaseUrl;
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
      case TargetPlatform.iOS:
        // Local Wi-Fi IP for physical mobile devices:
        return 'http://10.188.85.220:8000/api/v1';
      case TargetPlatform.macOS:
        return 'http://localhost:8000/api/v1';
      default:
        return 'http://127.0.0.1:8000/api/v1';
    }
  }
}
