import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'search_screen.dart';
import '../providers/settings_provider.dart';
import '../providers/auth_provider.dart';
import 'login_screen.dart';
import 'edit_profile_screen.dart';
import '../widgets/app_drawer.dart';
import '../widgets/profile_avatar.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final settingsProvider = Provider.of<SettingsProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);

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
              style: Theme.of(
                context,
              ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 32),
            _buildProfileSection(context, authProvider),
            const SizedBox(height: 32),
            _buildPreferencesSection(context, settingsProvider),
            const SizedBox(height: 32),
            _buildAccountSection(context, authProvider),
            const SizedBox(height: 32),
            Center(
              child: Text(
                'DAILY NEWS HUB V1.0.0',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.5),
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
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const SearchScreen()),
            );
          },
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

  Widget _buildProfileSection(BuildContext context, AuthProvider authProvider) {
    return Card(
      margin: EdgeInsets.zero,
      child: SizedBox(
        width: double.infinity,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              ProfileAvatar(
                imagePath: authProvider.currentUser?.profileImageUrl,
                size: 128,
                borderWidth: 4,
                placeholderIcon: Icons.person,
                placeholderIconSize: 64,
              ),
              const SizedBox(height: 16),
              Text(
                authProvider.isRegistered
                    ? authProvider.userName.toUpperCase()
                    : 'GUEST USER',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (authProvider.isRegistered)
                Text(
                  'Member since ${authProvider.currentUser?.registeredAt.year ?? ''}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.6),
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
                onPressed: authProvider.isRegistered
                    ? () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const EditProfileScreen(),
                          ),
                        );
                      }
                    : () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Please login to edit your profile'),
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
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPreferencesSection(
    BuildContext context,
    SettingsProvider settingsProvider,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 8, bottom: 8),
          child: Text(
            'PREFERENCES',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.5),
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
                secondary: Icon(
                  Icons.notifications,
                  color: Theme.of(context).colorScheme.primary,
                ),
                title: const Text('Push Notifications'),
                value: settingsProvider.pushNotifications,
                onChanged: (val) {
                  settingsProvider.togglePushNotifications();
                },
              ),
              const Divider(height: 1),
              SwitchListTile(
                secondary: Icon(
                  Icons.dark_mode,
                  color: Theme.of(context).colorScheme.primary,
                ),
                title: const Text('Dark Mode'),
                value: settingsProvider.darkMode,
                onChanged: (val) {
                  settingsProvider.toggleDarkMode();
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: Icon(
                  Icons.language,
                  color: Theme.of(context).colorScheme.primary,
                ),
                title: const Text('Language'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      settingsProvider.language,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withValues(alpha: 0.6),
                      ),
                    ),
                    Icon(
                      Icons.chevron_right,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ],
                ),
                onTap: () {
                  _showLanguageDialog(context, settingsProvider);
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: Icon(
                  Icons.newspaper,
                  color: Theme.of(context).colorScheme.primary,
                ),
                title: const Text('News Preferences'),
                trailing: Icon(
                  Icons.chevron_right,
                  color: Theme.of(context).colorScheme.primary,
                ),
                onTap: () {
                  _showPreferencesDialog(context, settingsProvider);
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAccountSection(BuildContext context, AuthProvider authProvider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 8, bottom: 8),
          child: Text(
            'ACCOUNT',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.5),
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
                leading: Icon(
                  Icons.shield,
                  color: Theme.of(context).colorScheme.primary,
                ),
                title: const Text('Privacy Policy'),
                trailing: Icon(
                  Icons.chevron_right,
                  color: Theme.of(context).colorScheme.primary,
                ),
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Privacy Policy'),
                      content: const SingleChildScrollView(
                        child: Text(
                          'Your privacy is important to us. Daily News Hub collects minimal data necessary to provide personalized daily briefings and allow commenting. We do not sell your personal information to third parties.\n\n(Note: This is a placeholder policy. Update with actual legal terms if required.)',
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
                leading: Icon(
                  Icons.info,
                  color: Theme.of(context).colorScheme.primary,
                ),
                title: const Text('About Daily News Hub'),
                trailing: Icon(
                  Icons.chevron_right,
                  color: Theme.of(context).colorScheme.primary,
                ),
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('About Daily News Hub'),
                      content: const SingleChildScrollView(
                        child: Text(
                          'Welcome to Daily News Hub, your ultimate destination for breaking global news, deep-dive features, and personalized daily briefings. Engineered with a user-centric philosophy, our application redefines how you consume media in the digital age. We break down the noise of the standard news cycle to bring you what truly matters, exactly when you need it.\n\nKey Features:\n• Daily Briefings: Tailored morning and evening updates curated specifically around your interests.\n• Trending Now: Real-time tracking of viral international stories across science, technology, and global markets.\n• Smart Categorization: Fluid navigation through cleanly segregated sectors like Economy, Business, and Tech.\n• Personalized Archive: A dedicated bookmarking system to save critical reporting for offline reading.',
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
              if (authProvider.isRegistered)
                ListTile(
                  leading: Icon(
                    Icons.logout,
                    color: Theme.of(context).colorScheme.error,
                  ),
                  title: Text(
                    'Logout',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                  onTap: () {
                    authProvider.logout();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Logged out successfully')),
                    );
                  },
                )
              else
                ListTile(
                  leading: Icon(
                    Icons.login,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  title: Text(
                    'Login or Register',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                    );
                  },
                ),
            ],
          ),
        ),
      ],
    );
  }

  void _showLanguageDialog(
    BuildContext context,
    SettingsProvider settingsProvider,
  ) {
    showDialog(
      context: context,
      builder: (context) {
        var selectedLanguage = settingsProvider.language;

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Select Language'),
              content: DropdownButtonFormField<String>(
                initialValue: selectedLanguage,
                items: const ['English', 'Spanish', 'French', 'German']
                    .map(
                      (lang) => DropdownMenuItem<String>(
                        value: lang,
                        child: Text(lang),
                      ),
                    )
                    .toList(),
                onChanged: (val) {
                  if (val == null) {
                    return;
                  }
                  setState(() {
                    selectedLanguage = val;
                  });
                },
                decoration: const InputDecoration(labelText: 'Language'),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    await settingsProvider.setLanguage(selectedLanguage);
                    if (context.mounted) {
                      Navigator.pop(context);
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

  void _showPreferencesDialog(
    BuildContext context,
    SettingsProvider settingsProvider,
  ) {
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('News Preferences'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children:
                      [
                        'Technology',
                        'Business',
                        'Sports',
                        'Entertainment',
                        'Health',
                        'Science',
                      ].map((pref) {
                        return CheckboxListTile(
                          title: Text(pref),
                          value: settingsProvider.newsPreferences.contains(
                            pref,
                          ),
                          onChanged: (val) {
                            settingsProvider.toggleNewsPreference(pref);
                            setState(() {});
                          },
                        );
                      }).toList(),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Close'),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
