import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'dart:async';
import '../providers/news_provider.dart';
import '../models/article.dart';
import '../widgets/article_image.dart';
import '../widgets/skeleton_loader.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final SpeechToText _speech = SpeechToText();
  bool _isListening = false;
  Timer? _searchDebounce;

  final List<String> _recentSearches = [
    'Technology',
    'Global Markets',
    'Exoplanet',
  ];

  final List<Map<String, dynamic>> _trendingTopics = [
    {'title': 'Economy', 'articles': '12.4K Articles'},
    {'title': 'Technology', 'articles': '8.2K Articles'},
    {'title': 'Science', 'articles': '5.9K Articles'},
  ];

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _startVoiceSearch() async {
    if (_isListening) {
      await _speech.stop();
      setState(() => _isListening = false);
      return;
    }

    final available = await _speech.initialize(
      onError: (_) => setState(() => _isListening = false),
      onStatus: (status) {
        if (status == 'done') setState(() => _isListening = false);
      },
    );

    if (available) {
      setState(() => _isListening = true);
      await _speech.listen(
        onResult: (result) {
          _searchController.text = result.recognizedWords;
          if (result.finalResult) {
            setState(() => _isListening = false);
            ref.read(newsProvider.notifier).search(result.recognizedWords);
          }
        },
        listenFor: const Duration(seconds: 10),
        cancelOnError: true,
        partialResults: true,
      );
    }
  }

  void _onSearchChanged() {
    if (!mounted) return;
    _searchDebounce?.cancel();
    final query = _searchController.text;
    _searchDebounce = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      ref.read(newsProvider.notifier).search(query);
      setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) {
    final newsState = ref.watch(newsProvider);
    final isSearching = _searchController.text.isNotEmpty;
    final searchResults = newsState.searchResults;

    return Scaffold(
      appBar: _buildAppBar(context),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(
          left: 16,
          right: 16,
          top: 32,
          bottom: 32,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSearchInput(context),
            const SizedBox(height: 32),
            if (isSearching)
              _buildSearchResults(searchResults, newsState.isLoading)
            else ...[
              _buildRecentSearches(context),
              const SizedBox(height: 32),
              _buildTrendingTopics(context),
            ],
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      centerTitle: true,
      leading: IconButton(
        icon: Icon(
          Icons.arrow_back,
          color: Theme.of(context).iconTheme.color,
          size: 28,
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: const Text('DAILY NEWS HUB'),
      actions: [
        IconButton(
          icon: Icon(
            Icons.search,
            color: Theme.of(context).iconTheme.color,
            size: 28,
          ),
          onPressed: () {},
        ),
        const SizedBox(width: 8),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1.0),
        child: Container(
          color: Theme.of(context).dividerTheme.color,
          height: 1.0,
        ),
      ),
    );
  }

  Widget _buildSearchInput(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'SEARCH',
          style:
              Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 36),
        ),
        const SizedBox(height: 24),
        Container(
          decoration: BoxDecoration(
            color: Theme.of(context).inputDecorationTheme.fillColor,
            borderRadius: BorderRadius.circular(12),
          ),
          padding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Icon(
                Icons.search,
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.5),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _searchController,
                  style: Theme.of(context).textTheme.bodyLarge,
                  decoration: InputDecoration(
                    hintText: 'Search articles...',
                    hintStyle:
                        Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: 0.5),
                            ),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    fillColor: Colors.transparent,
                    filled: true,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              if (_searchController.text.isNotEmpty)
                GestureDetector(
                  onTap: () => _searchController.clear(),
                  child: Icon(
                    Icons.close,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.5),
                  ),
                )
              else
                GestureDetector(
                  onTap: _startVoiceSearch,
                  child: Icon(
                    _isListening ? Icons.mic : Icons.mic_none_outlined,
                    color: _isListening
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.5),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSearchResults(List<Article> results, bool isLoading) {
    if (isLoading) {
      return ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: 5,
        separatorBuilder: (_, __) => const SizedBox(height: 16),
        itemBuilder: (_, __) => const ListArticleSkeletonCard(),
      );
    }
    if (results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Text(
            'No articles found.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      );
    }
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: results.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final article = results[index];
        return GestureDetector(
          onTap: () {
            Navigator.pushNamed(context, '/article', arguments: article);
          },
          child: Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ArticleImage(
                      imageUrl: article.imageUrl,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          article.category.toUpperCase(),
                          style: GoogleFonts.inter(
                            color: Theme.of(context).colorScheme.primary,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          article.title,
                          style: Theme.of(context)
                              .textTheme
                              .titleLarge
                              ?.copyWith(fontSize: 16),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildRecentSearches(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: BoxDecoration(
            border: Border(
              bottom:
                  BorderSide(color: Theme.of(context).dividerTheme.color!),
            ),
          ),
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                'RECENT SEARCHES',
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontSize: 20),
              ),
              Text(
                'CLEAR ALL',
                style: GoogleFonts.inter(
                  color: Theme.of(context).colorScheme.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: _recentSearches.map((search) {
            return GestureDetector(
              onTap: () => _searchController.text = search,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color:
                      Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.history,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.6),
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Text(search,
                        style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildTrendingTopics(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.trending_up,
              color: Theme.of(context).colorScheme.primary,
              size: 24,
            ),
            const SizedBox(width: 8),
            Text(
              'TRENDING TOPICS',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontSize: 20),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _trendingTopics.length,
          separatorBuilder: (_, __) => const SizedBox(height: 16),
          itemBuilder: (context, index) {
            final topic = _trendingTopics[index];
            return GestureDetector(
              onTap: () => _searchController.text = topic['title']!,
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: Theme.of(context)
                          .colorScheme
                          .surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '${index + 1}',
                      style: GoogleFonts.spaceGrotesk(
                        color: Theme.of(context).colorScheme.primary,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          topic['title']!,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          topic['articles']!,
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurface
                                    .withValues(alpha: 0.6),
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}
