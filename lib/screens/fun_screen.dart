import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../providers/news_provider.dart';
import '../models/article.dart';

class FunScreen extends ConsumerStatefulWidget {
  const FunScreen({super.key});

  @override
  ConsumerState<FunScreen> createState() => _FunScreenState();
}

class _FunScreenState extends ConsumerState<FunScreen> {
  Map<String, dynamic>? _quote;
  bool _quoteLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchQuote();
  }

  Future<void> _fetchQuote() async {
    setState(() => _quoteLoading = true);
    try {
      final uri = Uri.parse('${ApiConfig.baseUrl}/fun/quote-of-the-day');
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() => _quote = data['data'] as Map<String, dynamic>?);
      }
    } catch (_) {}
    setState(() => _quoteLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final newsState = ref.watch(newsProvider);
    final articles = newsState.allArticles;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Fun Zone'),
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back,
              color: Theme.of(context).iconTheme.color),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Quote of the Day
          if (_quoteLoading)
            const Center(
                child: Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(),
            ))
          else if (_quote != null)
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.format_quote,
                            color: Theme.of(context).colorScheme.primary,
                            size: 28),
                        const SizedBox(width: 8),
                        Text('Quote of the Day',
                            style: GoogleFonts.spaceGrotesk(
                                fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      '"${_quote!['quote']}"',
                      style: Theme.of(context)
                          .textTheme
                          .bodyLarge
                          ?.copyWith(height: 1.5, fontStyle: FontStyle.italic),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '— ${_quote!['author']}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.primary,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),
          // News Quiz Card
          _FunCard(
            icon: Icons.quiz_outlined,
            title: 'News Quiz',
            subtitle: 'Test your knowledge on today\'s top stories',
            onTap: () => _showFunPicker(context, articles, 'quiz'),
          ),
          const SizedBox(height: 12),
          // News Debate Card
          _FunCard(
            icon: Icons.record_voice_over_outlined,
            title: 'News Debate',
            subtitle: 'See both sides of today\'s biggest stories',
            onTap: () => _showFunPicker(context, articles, 'debate'),
          ),
        ],
      ),
    );
  }

  void _showFunPicker(
    BuildContext context,
    List<Article> articles,
    String type,
  ) {
    final displayArticles =
        articles.isEmpty ? [] : articles.take(10).toList();

    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).cardTheme.color,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              type == 'quiz'
                  ? 'Pick an article for your quiz'
                  : 'Pick an article for debate',
              style: GoogleFonts.spaceGrotesk(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
          const Divider(height: 1),
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.5,
            ),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: displayArticles.length,
              itemBuilder: (_, i) => ListTile(
                title: Text(
                  displayArticles[i].title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _runFunActivity(
                      context, displayArticles[i].id, type);
                },
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Future<void> _runFunActivity(
    BuildContext context,
    String articleId,
    String type,
  ) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      SnackBar(
        content: Text(type == 'quiz'
            ? 'Generating quiz...'
            : 'Generating debate...'),
      ),
    );

    try {
      final endpoint =
          type == 'quiz' ? '/fun/news-quiz' : '/fun/news-debate';
      final uri = Uri.parse(
          '${ApiConfig.baseUrl}$endpoint?article_id=$articleId');
      final response = await http.get(uri);

      if (response.statusCode == 200 && context.mounted) {
        final data = jsonDecode(response.body);
        final funData = data['data'];

        showDialog(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: Text(type == 'quiz' ? 'News Quiz' : 'News Debate'),
            content: SingleChildScrollView(
              child: Text(
                funData is List
                    ? _formatQuiz(funData)
                    : _formatDebate(funData),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Close'),
              ),
            ],
          ),
        );
      } else {
        if (context.mounted) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Failed to generate content')),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  String _formatQuiz(List<dynamic> quiz) {
    final buffer = StringBuffer();
    for (var i = 0; i < quiz.length; i++) {
      final q = quiz[i];
      buffer.writeln('${i + 1}. ${q['question']}\n');
      final options = q['options'] as List?;
      if (options != null) {
        for (var j = 0; j < options.length; j++) {
          final marker =
              j == q['correct_index'] ? ' ✓' : '';
          buffer.writeln('   ${String.fromCharCode(65 + j)}. ${options[j]}$marker');
        }
      }
      if (q['explanation'] != null) {
        buffer.writeln('\n   Explanation: ${q['explanation']}');
      }
      buffer.writeln();
    }
    return buffer.toString();
  }

  String _formatDebate(dynamic debate) {
    if (debate is! Map<String, dynamic>) return debate.toString();
    final buffer = StringBuffer();
    buffer.writeln('Topic: ${debate['topic']}\n');
    final sideA = debate['side_a'] as Map<String, dynamic>?;
    final sideB = debate['side_b'] as Map<String, dynamic>?;
    if (sideA != null) {
      buffer.writeln('Side A: ${sideA['position']}');
      buffer.writeln('${sideA['argument']}\n');
    }
    if (sideB != null) {
      buffer.writeln('Side B: ${sideB['position']}');
      buffer.writeln('${sideB['argument']}');
    }
    return buffer.toString();
  }
}

class _FunCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _FunCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context)
                      .colorScheme
                      .primary
                      .withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon,
                    color: Theme.of(context).colorScheme.primary, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.spaceGrotesk(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: 0.6),
                          ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.4),
                  size: 16),
            ],
          ),
        ),
      ),
    );
  }
}
