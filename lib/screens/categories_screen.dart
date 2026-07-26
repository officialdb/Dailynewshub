import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/news_provider.dart';
import '../models/article.dart';
import '../widgets/article_image.dart';

class CategoriesScreen extends ConsumerStatefulWidget {
  const CategoriesScreen({super.key});

  @override
  ConsumerState<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends ConsumerState<CategoriesScreen> {
  String _selectedCategory = 'All';

  @override
  Widget build(BuildContext context) {
    final newsState = ref.watch(newsProvider);
    final categories = <String>[
      'All',
      ...newsState.categories.map((c) => c.title),
    ];

    List<Article> articles = newsState.allArticles;
    if (_selectedCategory != 'All') {
      articles = articles
          .where(
            (a) => a.category.toUpperCase() == _selectedCategory.toUpperCase(),
          )
          .toList();
    }

    return Scaffold(
      appBar: AppBar(centerTitle: true, title: const Text('Categories')),
      body: Column(
        children: [
          _buildCategoriesHeader(categories),
          Expanded(
            child: SingleChildScrollView(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildContentHeader(context, articles.length),
                  const SizedBox(height: 24),
                  _buildArticleList(context, articles),
                  const SizedBox(height: 96),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoriesHeader(List<String> categories) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SizedBox(
        height: 36,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: categories.length,
          separatorBuilder: (_, __) => const SizedBox(width: 12),
          itemBuilder: (context, index) {
            final category = categories[index];
            final isSelected = category == _selectedCategory;
            return GestureDetector(
              onTap: () => setState(() => _selectedCategory = category),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(20),
                ),
                alignment: Alignment.center,
                child: Text(
                  category,
                  style: GoogleFonts.spaceGrotesk(
                    color: isSelected
                        ? Colors.white
                        : Theme.of(context).colorScheme.onSurface,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildContentHeader(BuildContext context, int count) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Text(
          _selectedCategory.toUpperCase(),
          style:
              Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 24),
        ),
        const SizedBox(width: 12),
        Text(
          '$count ARTICLES',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.6),
                fontWeight: FontWeight.bold,
              ),
        ),
      ],
    );
  }

  Widget _buildArticleList(BuildContext context, List<Article> articles) {
    if (articles.isEmpty) {
      return Center(
        child: Text(
          'No articles found.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      );
    }
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: articles.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, index) =>
          _buildArticleCard(context, articles[index]),
    );
  }

  Widget _buildArticleCard(BuildContext context, Article article) {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(context, '/article', arguments: article);
      },
      child: Card(
        margin: EdgeInsets.zero,
        child: SizedBox(
          height: 120,
          child: Row(
            children: [
              SizedBox(
                width: 120,
                height: 120,
                child: ArticleImage(
                  imageUrl: article.imageUrl,
                  fit: BoxFit.cover,
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        article.title,
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(fontSize: 16, height: 1.2),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              article.source,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.6),
                                  ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            article.timeAgo,
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
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
