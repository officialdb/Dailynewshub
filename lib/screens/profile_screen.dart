import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/settings_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/app_drawer.dart';
import '../widgets/profile_avatar.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final authState = ref.watch(authProvider);

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: _buildAppBar(context),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(
          left: 16,
          right: 16,
          top: 32,
          bottom: 96,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'PROFILE & SETTINGS',
              style: Theme.of(context)
                  .textTheme
                  .headlineMedium
                  ?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 32),
            _buildProfileSection(context, authState),
            const SizedBox(height: 32),
            _buildPreferencesSection(context, ref, settings),
            const SizedBox(height: 32),
            _buildAccountSection(context, ref, authState),
            const SizedBox(height: 32),
            Center(
              child: Text(
                'DAILY NEWS HUB V1.0.0',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.5),
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2.0,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      centerTitle: true,
      title: const Text('DAILY NEWS HUB'),
      actions: [
        IconButton(
          icon: Icon(
            Icons.search,
            color: Theme.of(context).iconTheme.color,
            size: 28,
          ),
          onPressed: () => Navigator.pushNamed(context, '/search'),
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

  Widget _buildProfileSection(BuildContext context, AuthState authState) {
    return Card(
      margin: EdgeInsets.zero,
      child: SizedBox(
        width: double.infinity,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              ProfileAvatar(
                imagePath: authState.user?.profileImageUrl,
                size: 128,
                borderWidth: 4,
                placeholderIcon: Icons.person,
                placeholderIconSize: 64,
              ),
              const SizedBox(height: 16),
              Text(
                authState.isRegistered
                    ? authState.userName.toUpperCase()
                    : 'GUEST USER',
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              if (authState.isRegistered)
                Text(
                  'Member since ${authState.user?.registeredAt.year ?? ''}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.6),
                      ),
                ),
              const SizedBox(height: 24),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                    color: Theme.of(context).colorScheme.primary,
                    width: 2,
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                ),
                onPressed: authState.isRegistered
                    ? () => Navigator.pushNamed(context, '/edit-profile')
                    : () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content:
                                Text('Please login to edit your profile'),
                          ),
                        );
                      },
                child: Text(
                  'EDIT PROFILE',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2.0,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // News Channels link
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.tv_outlined,
                    color: Theme.of(context).colorScheme.primary),
                title: const Text('News Channels'),
                trailing: Icon(Icons.arrow_forward_ios,
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                    size: 16),
                onTap: () => Navigator.pushNamed(context, '/channels'),
              ),
              // Fun Zone link
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.celebration_outlined,
                    color: Theme.of(context).colorScheme.primary),
                title: const Text('Fun Zone'),
                trailing: Icon(Icons.arrow_forward_ios,
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                    size: 16),
                onTap: () => Navigator.pushNamed(context, '/fun'),
              ),
              // News Preferences link
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.tune,
                    color: Theme.of(context).colorScheme.primary),
                title: const Text('News Preferences'),
                trailing: Icon(Icons.arrow_forward_ios,
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                    size: 16),
                onTap: () => Navigator.pushNamed(context, '/preferences'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPreferencesSection(
    BuildContext context,
    WidgetRef ref,
    SettingsState settings,
  ) {
    final notifier = ref.read(settingsProvider.notifier);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 8, bottom: 8),
          child: Text(
            'PREFERENCES',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.5),
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2.0,
                ),
          ),
        ),
        Card(
          margin: EdgeInsets.zero,
          child: Column(
            children: [
              SwitchListTile(
                secondary: Icon(Icons.notifications,
                    color: Theme.of(context).colorScheme.primary),
                title: const Text('Push Notifications'),
                value: settings.pushNotifications,
                onChanged: (_) => notifier.togglePushNotifications(),
              ),
              const Divider(height: 1),
              SwitchListTile(
                secondary: Icon(Icons.dark_mode,
                    color: Theme.of(context).colorScheme.primary),
                title: const Text('Dark Mode'),
                value: settings.darkMode,
                onChanged: (_) => notifier.toggleDarkMode(),
              ),
              const Divider(height: 1),
              ListTile(
                leading: Icon(Icons.language,
                    color: Theme.of(context).colorScheme.primary),
                title: const Text('Language'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      settings.language,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: 0.6),
                          ),
                    ),
                    Icon(Icons.chevron_right,
                        color: Theme.of(context).colorScheme.primary),
                  ],
                ),
                onTap: () => _showLanguageDialog(context, ref),
              ),
              const Divider(height: 1),
              // Font size slider
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Article Font Size',
                        style: Theme.of(context).textTheme.bodyMedium),
                    Slider(
                      value: settings.fontSize,
                      min: 12,
                      max: 22,
                      divisions: 5,
                      activeColor: Theme.of(context).colorScheme.primary,
                      inactiveColor:
                          Theme.of(context).colorScheme.surfaceContainerHighest,
                      label: '${settings.fontSize.round()}px',
                      onChanged: (val) => notifier.setFontSize(val),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('A',
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(fontSize: 12)),
                        Text('A',
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(fontSize: 20)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAccountSection(
    BuildContext context,
    WidgetRef ref,
    AuthState authState,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 8, bottom: 8),
          child: Text(
            'ACCOUNT',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.5),
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2.0,
                ),
          ),
        ),
        Card(
          margin: EdgeInsets.zero,
          child: Column(
            children: [
              ListTile(
                leading: Icon(Icons.shield,
                    color: Theme.of(context).colorScheme.primary),
                title: const Text('Privacy Policy'),
                trailing: Icon(Icons.chevron_right,
                    color: Theme.of(context).colorScheme.primary),
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Privacy Policy'),
                      content: const SingleChildScrollView(
                        child: Text(
                          'Your privacy is important to us. Daily News Hub collects minimal data necessary to provide personalized daily briefings and allow commenting. We do not sell your personal information to third parties.',
                        ),
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Close'),
                        ),
                      ],
                    ),
                  );
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: Icon(Icons.info,
                    color: Theme.of(context).colorScheme.primary),
                title: const Text('About Daily News Hub'),
                trailing: Icon(Icons.chevron_right,
                    color: Theme.of(context).colorScheme.primary),
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('About Daily News Hub'),
                      content: const SingleChildScrollView(
                        child: Text(
                          'Welcome to Daily News Hub, your ultimate destination for breaking global news, deep-dive features, and personalized daily briefings.',
                        ),
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Close'),
                        ),
                      ],
                    ),
                  );
                },
              ),
              const Divider(height: 1),
              if (authState.isRegistered)
                ListTile(
                  leading: Icon(Icons.logout,
                      color: Theme.of(context).colorScheme.error),
                  title: Text(
                    'Logout',
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.error),
                  ),
                  onTap: () {
                    ref.read(authProvider.notifier).logout();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Logged out successfully')),
                    );
                  },
                )
              else
                ListTile(
                  leading: Icon(Icons.login,
                      color: Theme.of(context).colorScheme.primary),
                  title: Text(
                    'Login or Register',
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.primary),
                  ),
                  onTap: () => Navigator.pushNamed(context, '/login'),
                ),
            ],
          ),
        ),
      ],
    );
  }

  void _showLanguageDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (dialogContext) {
        var selectedLanguage = ref.read(settingsProvider).language;
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Select Language'),
              content: DropdownButtonFormField<String>(
                value: selectedLanguage,
                items: const ['English', 'Spanish', 'French', 'German']
                    .map(
                      (lang) => DropdownMenuItem<String>(
                        value: lang,
                        child: Text(lang),
                      ),
                    )
                    .toList(),
                onChanged: (val) {
                  if (val == null) return;
                  setState(() => selectedLanguage = val);
                },
                decoration: const InputDecoration(labelText: 'Language'),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    await ref
                        .read(settingsProvider.notifier)
                        .setLanguage(selectedLanguage);
                    if (dialogContext.mounted) {
                      Navigator.pop(dialogContext);
                    }
                  },
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
