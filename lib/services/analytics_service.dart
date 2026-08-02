import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../config.dart';
import 'auth_service.dart';

class AnalyticsService {
  static final AnalyticsService _instance = AnalyticsService._internal();
  factory AnalyticsService() => _instance;
  AnalyticsService._internal();

  String? _sessionId;

  Future<String> _getSessionId() async {
    if (_sessionId != null) return _sessionId!;
    final prefs = await SharedPreferences.getInstance();
    _sessionId = prefs.getString('analytics_session_id');
    if (_sessionId == null) {
      _sessionId = const Uuid().v4();
      await prefs.setString('analytics_session_id', _sessionId!);
    }
    return _sessionId!;
  }

  Future<void> submitArticleAnalytics(
    String articleId,
    double readDepthPercent,
    int timeSpentSeconds,
  ) async {
    final sessionId = await _getSessionId();
    final token = AuthService().token;
    
    // We send to API V2 analytics endpoint
    final uri = Uri.parse('${Config.apiBaseUrlV2}/articles/$articleId/analytics');
    
    final body = jsonEncode({
      'session_id': sessionId,
      'read_depth_percent': readDepthPercent,
      'time_spent_seconds': timeSpentSeconds,
      'source': 'mobile_app',
      'device_platform': 'flutter', // Could use Platform.operatingSystem
    });

    try {
      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: body,
      );
      
      if (response.statusCode != 204) {
        print('Failed to submit analytics: ${response.statusCode}');
      }
    } catch (e) {
      print('Error submitting analytics: $e');
    }
  }
}
