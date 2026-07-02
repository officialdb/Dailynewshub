import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/splash_screen.dart';
import 'providers/settings_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/news_provider.dart';
import 'providers/notification_provider.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProxyProvider<AuthProvider, NotificationProvider>(
          create: (_) => NotificationProvider(),
          update: (_, authProvider, notificationProvider) =>
              notificationProvider!..setAuthProvider(authProvider),
        ),
        ChangeNotifierProxyProvider2<
          AuthProvider,
          NotificationProvider,
          NewsProvider
        >(
          create: (_) => NewsProvider(),
          update: (_, authProvider, notificationProvider, newsProvider) =>
              newsProvider!
                ..setAuthProvider(authProvider)
                ..bindLiveUpdates(notificationProvider),
        ),
      ],
      child: const DailyNewsHubApp(),
    ),
  );
}

class DailyNewsHubApp extends StatelessWidget {
  const DailyNewsHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsProvider>(
      builder: (context, settings, child) {
        return MaterialApp(
          title: 'Daily News Hub',
          debugShowCheckedModeBanner: false,
          themeMode: settings.darkMode ? ThemeMode.dark : ThemeMode.light,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          home: const SplashScreen(),
        );
      },
    );
  }
}
