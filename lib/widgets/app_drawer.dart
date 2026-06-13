import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../main_layout.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  void _navigateToTab(BuildContext context, int index) {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => MainLayout(initialIndex: index)),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: const Color(0xFF0A0E21),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1D2035),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE23B3B), width: 2),
                    ),
                    child: const Icon(Icons.newspaper, color: Colors.white, size: 32),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'DAILY NEWS HUB',
                    style: GoogleFonts.spaceGrotesk(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1.0,
                    ),
                  ),
                  Text(
                    'Your daily dose of reality.',
                    style: GoogleFonts.inter(
                      color: const Color(0xFF6B7280),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const Divider(color: Color(0xFF374151), thickness: 1),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 16),
                children: [
                  _buildDrawerItem(
                    icon: Icons.home,
                    title: 'Home',
                    onTap: () => _navigateToTab(context, 0),
                  ),
                  _buildDrawerItem(
                    icon: Icons.trending_up,
                    title: 'Trending',
                    onTap: () => _navigateToTab(context, 0),
                  ),
                  _buildDrawerItem(
                    icon: Icons.category,
                    title: 'Categories',
                    onTap: () => _navigateToTab(context, 1),
                  ),
                  _buildDrawerItem(
                    icon: Icons.bookmark,
                    title: 'Saved Articles',
                    onTap: () => _navigateToTab(context, 2),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    child: Divider(color: Color(0xFF374151), thickness: 1),
                  ),
                  _buildDrawerItem(
                    icon: Icons.settings,
                    title: 'Settings',
                    onTap: () => _navigateToTab(context, 3),
                  ),
                  _buildDrawerItem(
                    icon: Icons.help_outline,
                    title: 'Help & Support',
                    onTap: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Help & Support coming soon!')),
                      );
                    },
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Text(
                'Version 1.0.0',
                style: GoogleFonts.inter(
                  color: const Color(0xFF6B7280),
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: Colors.white),
      title: Text(
        title,
        style: GoogleFonts.spaceGrotesk(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24),
      onTap: onTap,
    );
  }
}
