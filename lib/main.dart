import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'providers/settings_provider.dart';
import 'services/offline_service.dart';
import 'models/article.dart';
import 'screens/article_detail_screen.dart';
import 'screens/categories_screen.dart';
import 'screens/channels_screen.dart';
import 'screens/edit_profile_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/fun_screen.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/main_layout.dart';
import 'screens/news_preferences_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/reading_history_screen.dart';
import 'screens/reels_screen.dart';
import 'screens/register_screen.dart';
import 'screens/saved_articles_screen.dart';
import 'screens/search_screen.dart';
import 'screens/splash_screen.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await OfflineService.init();
  runApp(
    const ProviderScope(
      child: DailyNewsHubApp(),
    ),
  );
}

class DailyNewsHubApp extends ConsumerWidget {
  const DailyNewsHubApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    return MaterialApp(
      title: 'Daily News Hub',
      debugShowCheckedModeBanner: false,
      themeMode: settings.darkMode ? ThemeMode.dark : ThemeMode.light,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      initialRoute: '/',
      onGenerateRoute: _onGenerateRoute,
    );
  }

  static Route<dynamic>? _onGenerateRoute(RouteSettings routeSettings) {
    switch (routeSettings.name) {
      case '/':
        return MaterialPageRoute(builder: (_) => const SplashScreen());
      case '/onboarding':
        return MaterialPageRoute(builder: (_) => const OnboardingScreen());
      case '/home':
        final args = routeSettings.arguments;
        final initialIndex = args is Map ? (args['initialIndex'] as int? ?? 0) : 0;
        return MaterialPageRoute(
            builder: (_) => MainLayout(initialIndex: initialIndex));
      case '/login':
        return MaterialPageRoute(builder: (_) => const LoginScreen());
      case '/register':
        return MaterialPageRoute(builder: (_) => const RegisterScreen());
      case '/forgot-password':
        return MaterialPageRoute(
            builder: (_) => const ForgotPasswordScreen());
      case '/search':
        return MaterialPageRoute(builder: (_) => const SearchScreen());
      case '/notifications':
        return MaterialPageRoute(
            builder: (_) => const NotificationsScreen());
      case '/profile':
        return MaterialPageRoute(builder: (_) => const ProfileScreen());
      case '/edit-profile':
        return MaterialPageRoute(builder: (_) => const EditProfileScreen());
      case '/saved':
        return MaterialPageRoute(
            builder: (_) => const SavedArticlesScreen());
      case '/channels':
        return MaterialPageRoute(builder: (_) => const ChannelsScreen());
      case '/categories':
        return MaterialPageRoute(
            builder: (_) => const CategoriesScreen());
      case '/reading-history':
        return MaterialPageRoute(
            builder: (_) => const ReadingHistoryScreen());
      case '/preferences':
        return MaterialPageRoute(
            builder: (_) => const NewsPreferencesScreen());
      case '/fun':
        return MaterialPageRoute(builder: (_) => const FunScreen());
      case '/article':
        final article = routeSettings.arguments;
        if (article is Article) {
          return MaterialPageRoute(
            builder: (_) => ArticleDetailScreen(article: article),
          );
        }
        return null;
      default:
        return null;
    }
  }
}
