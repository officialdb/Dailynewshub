import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'search_screen.dart';
import 'providers/settings_provider.dart';
import 'widgets/app_drawer.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final settingsProvider = Provider.of<SettingsProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0E21),
      drawer: const AppDrawer(),
      appBar: _buildAppBar(context),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(left: 16, right: 16, top: 32, bottom: 96),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'PROFILE & SETTINGS',
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 32,
                fontWeight: FontWeight.w900,
                letterSpacing: -1.0,
              ),
            ),
            const SizedBox(height: 32),
            _buildProfileSection(),
            const SizedBox(height: 32),
            _buildPreferencesSection(settingsProvider),
            const SizedBox(height: 32),
            _buildAccountSection(),
            const SizedBox(height: 32),
            Center(
              child: Text(
                'DAILY NEWS HUB V1.0.0',
                style: GoogleFonts.spaceGrotesk(
                  color: const Color(0xFF6B7280),
                  fontSize: 12,
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
    return PreferredSize(
      preferredSize: const Size.fromHeight(64.0),
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF0A0E21),
          border: Border(bottom: BorderSide(color: Colors.black, width: 4)),
          boxShadow: [
            BoxShadow(
              color: Colors.black,
              offset: Offset(4, 4),
              blurRadius: 0,
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Builder(
                  builder: (context) {
                    return IconButton(
                      icon: const Icon(Icons.menu, color: Color(0xFFE23B3B), size: 28),
                      onPressed: () {
                        Scaffold.of(context).openDrawer();
                      },
                    );
                  }
                ),
                Text(
                  'DAILY NEWS HUB',
                  style: GoogleFonts.spaceGrotesk(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -1.0,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.search, color: Color(0xFFE23B3B), size: 28),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const SearchScreen()),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProfileSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF1D2035),
        border: Border.all(color: Colors.black, width: 4),
        boxShadow: const [
          BoxShadow(
            color: Colors.black,
            offset: Offset(4, 4),
            blurRadius: 0,
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 128,
            height: 128,
            decoration: BoxDecoration(
              color: Colors.black,
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFE23B3B), width: 4),
              boxShadow: const [
                BoxShadow(
                  color: Colors.black,
                  offset: Offset(2, 2),
                  blurRadius: 0,
                ),
              ],
            ),
            child: ClipOval(
              child: Image.asset(
                'https://lh3.googleusercontent.com/aida-public/AB6AXuAYwJSkrt9xk33X9VZb_JS0gKl9jVx8pdOj5GnpTFixXB_jvHfZ6nnPALpc5_nwkYJsS5U506Ka-Z4GH0nnTxSaXN9hOQGTeM17aeLaLc1v5K2CZlHbBeSg0miWwRgL3Aylkr9GDEUe2iM0yH3cBZQnjmhE3g2Ds35Qyx57yDU6cqRm_gaVRpAzArHrLiboa0G_o9s5X-bQuCY2ZcpxEYEV7bENYT4GrDCN4kCYemdXjtK1dooGAEzyRL7N3x3RUEs0z2NFd91H6jE',
                fit: BoxFit.cover,
                color: Colors.grey,
                colorBlendMode: BlendMode.saturation,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'JOHN DOE',
            style: GoogleFonts.spaceGrotesk(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            'johndoe@email.com',
            style: GoogleFonts.inter(
              color: const Color(0xFF6B7280),
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 24),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE23B3B), width: 4),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () {},
                splashColor: const Color(0xFFE23B3B).withOpacity(0.3),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  child: Text(
                    'EDIT PROFILE',
                    style: GoogleFonts.spaceGrotesk(
                      color: const Color(0xFFE23B3B),
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2.0,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreferencesSection(SettingsProvider settingsProvider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 8, bottom: 8),
          child: Text(
            'PREFERENCES',
            style: GoogleFonts.spaceGrotesk(
              color: const Color(0xFF6B7280),
              fontSize: 14,
              fontWeight: FontWeight.bold,
              letterSpacing: 2.0,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF1D2035),
            border: Border.all(color: Colors.black, width: 4),
            boxShadow: const [
              BoxShadow(
                color: Colors.black,
                offset: Offset(4, 4),
                blurRadius: 0,
              ),
            ],
          ),
          child: Column(
            children: [
              _buildToggleRow(
                icon: Icons.notifications,
                label: 'Push Notifications',
                value: settingsProvider.pushNotifications,
                onChanged: (val) {
                  settingsProvider.togglePushNotifications();
                },
              ),
              _buildDivider(),
              _buildToggleRow(
                icon: Icons.dark_mode,
                label: 'Dark Mode',
                value: settingsProvider.darkMode,
                onChanged: (val) {
                  settingsProvider.toggleDarkMode();
                },
              ),
              _buildDivider(),
              _buildActionRow(
                icon: Icons.language,
                label: 'Language',
                trailing: Row(
                  children: [
                    Text(
                      'English',
                      style: GoogleFonts.inter(
                        color: const Color(0xFF6B7280),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: Color(0xFFE23B3B)),
                  ],
                ),
              ),
              _buildDivider(),
              _buildActionRow(
                icon: Icons.newspaper,
                label: 'News Preferences',
                trailing: const Icon(Icons.chevron_right, color: Color(0xFFE23B3B)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAccountSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 8, bottom: 8),
          child: Text(
            'ACCOUNT',
            style: GoogleFonts.spaceGrotesk(
              color: const Color(0xFF6B7280),
              fontSize: 14,
              fontWeight: FontWeight.bold,
              letterSpacing: 2.0,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF1D2035),
            border: Border.all(color: Colors.black, width: 4),
            boxShadow: const [
              BoxShadow(
                color: Colors.black,
                offset: Offset(4, 4),
                blurRadius: 0,
              ),
            ],
          ),
          child: Column(
            children: [
              _buildActionRow(
                icon: Icons.shield,
                label: 'Privacy Policy',
                trailing: const Icon(Icons.chevron_right, color: Color(0xFFE23B3B)),
              ),
              _buildDivider(),
              _buildActionRow(
                icon: Icons.info,
                label: 'About Daily News Hub',
                trailing: const Icon(Icons.chevron_right, color: Color(0xFFE23B3B)),
              ),
              _buildDivider(),
              _buildActionRow(
                icon: Icons.logout,
                label: 'Logout',
                labelColor: const Color(0xFFE23B3B),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 4,
      color: Colors.black,
    );
  }

  Widget _buildToggleRow({
    required IconData icon,
    required String label,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return InkWell(
      onTap: () => onChanged(!value),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFFE23B3B)),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label.toUpperCase(),
                style: GoogleFonts.spaceGrotesk(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            _buildBrutalistToggle(value),
          ],
        ),
      ),
    );
  }

  Widget _buildBrutalistToggle(bool value) {
    return Container(
      width: 56,
      height: 32,
      decoration: BoxDecoration(
        color: value ? const Color(0xFFE23B3B) : Colors.black,
        border: Border.all(color: Colors.black, width: 4),
      ),
      child: Stack(
        children: [
          AnimatedPositioned(
            duration: const Duration(milliseconds: 200),
            left: value ? 24 : 0,
            top: 0,
            bottom: 0,
            width: 24,
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.black,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionRow({
    required IconData icon,
    required String label,
    Widget? trailing,
    Color labelColor = Colors.white,
  }) {
    return InkWell(
      onTap: () {},
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFFE23B3B)),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label.toUpperCase(),
                style: GoogleFonts.spaceGrotesk(
                  color: labelColor,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            ?trailing,
          ],
        ),
      ),
    );
  }
}
