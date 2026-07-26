import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/news_provider.dart';
import '../providers/settings_provider.dart';

class NewsPreferencesScreen extends ConsumerStatefulWidget {
  final bool isOnboarding;
  const NewsPreferencesScreen({super.key, this.isOnboarding = false});

  @override
  ConsumerState<NewsPreferencesScreen> createState() =>
      _NewsPreferencesScreenState();
}

class _NewsPreferencesScreenState
    extends ConsumerState<NewsPreferencesScreen> {
  late List<String> _selectedSlugs;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _selectedSlugs =
        List<String>.from(ref.read(settingsProvider).newsPreferences);
  }

  Future<void> _savePreferences() async {
    if (_selectedSlugs.isEmpty) return;
    setState(() => _isSaving = true);
    try {
      await ref
          .read(settingsProvider.notifier)
          .setNewsPreferences(_selectedSlugs);
      if (mounted) {
        if (widget.isOnboarding) {
          Navigator.pushReplacementNamed(context, '/home');
        } else {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Preferences saved')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final newsState = ref.watch(newsProvider);
    final categories = newsState.categories;

    return Scaffold(
      appBar: widget.isOnboarding
          ? null
          : AppBar(
              title: const Text('News Preferences'),
              centerTitle: true,
              leading: IconButton(
                icon: Icon(
                  Icons.arrow_back,
                  color: Theme.of(context).iconTheme.color,
                ),
                onPressed: () => Navigator.pop(context),
              ),
            ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.isOnboarding) const SizedBox(height: 60),
            Text(
              'What interests you?',
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Pick topics to personalize your news feed.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.6),
                  ),
            ),
            const SizedBox(height: 32),
            Expanded(
              child: categories.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: categories.map((cat) {
                        final isSelected =
                            _selectedSlugs.contains(cat.title);
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              if (isSelected) {
                                _selectedSlugs.remove(cat.title);
                              } else {
                                _selectedSlugs.add(cat.title);
                              }
                            });
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? Theme.of(context).colorScheme.primary
                                  : Colors.transparent,
                              border: Border.all(
                                color: isSelected
                                    ? Theme.of(context).colorScheme.primary
                                    : Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.4),
                              ),
                              borderRadius: BorderRadius.circular(24),
                            ),
                            child: Text(
                              cat.title,
                              style: TextStyle(
                                color: isSelected
                                    ? Colors.white
                                    : Theme.of(context)
                                        .colorScheme
                                        .onSurface,
                                fontWeight: isSelected
                                    ? FontWeight.w600
                                    : FontWeight.normal,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed:
                    (_selectedSlugs.isEmpty || _isSaving)
                        ? null
                        : _savePreferences,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  disabledBackgroundColor: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.3),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSaving
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text(
                        _selectedSlugs.isEmpty
                            ? 'Select at least one topic'
                            : 'Save Preferences (${_selectedSlugs.length} selected)',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
