import 'package:flutter/material.dart';

class NewsCategory {
  const NewsCategory({
    required this.id,
    required this.title,
    required this.icon,
    this.slug,
  });

  final String id;
  final String title;
  final IconData icon;
  final String? slug;

  factory NewsCategory.fromJson(Map<String, dynamic> json) {
    final title = _stringValue(json['name']) ?? 'General';
    final slug = _stringValue(json['slug']);
    return NewsCategory(
      id: _stringValue(json['id']) ?? '',
      title: title,
      slug: slug,
      icon: _iconFor(_stringValue(json['icon']), title, slug),
    );
  }

  static String? _stringValue(dynamic value) {
    if (value == null) {
      return null;
    }
    final text = value.toString().trim();
    return text.isEmpty ? null : text;
  }

  static IconData _iconFor(String? rawIcon, String title, String? slug) {
    final normalized = (rawIcon ?? slug ?? title).toLowerCase();
    switch (normalized) {
      case 'memory':
      case 'technology':
      case 'tech':
      case 'computer':
        return Icons.memory;
      case 'trending_up':
      case 'business':
      case 'economy':
        return Icons.trending_up;
      case 'science':
      case 'research':
      case 'physics':
        return Icons.science;
      case 'health':
      case 'health_and_safety':
      case 'medical':
        return Icons.health_and_safety;
      case 'sports':
      case 'sports_basketball':
      case 'sports_soccer':
        return Icons.sports_basketball;
      case 'movie':
      case 'entertainment':
      case 'film':
        return Icons.movie;
      case 'eco':
      case 'environment':
      case 'climate':
        return Icons.eco;
      case 'account_balance':
      case 'finance':
        return Icons.account_balance;
      case 'public':
      case 'world':
      case 'news':
        return Icons.public;
      default:
        return Icons.category;
    }
  }
}
