import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart' as legacy_provider;
import '../providers/channels_provider.dart';
import '../providers/auth_provider.dart';
import '../models/channel.dart';

class ChannelsScreen extends ConsumerStatefulWidget {
  const ChannelsScreen({super.key});

  @override
  ConsumerState<ChannelsScreen> createState() => _ChannelsScreenState();
}

class _ChannelsScreenState extends ConsumerState<ChannelsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = legacy_provider.Provider.of<AuthProvider>(context, listen: false);
      ref.read(followedChannelsProvider.notifier).setToken(auth.currentUser?.accessToken);
      ref.read(discoverChannelsProvider.notifier).setToken(auth.currentUser?.accessToken);
      
      ref.read(followedChannelsProvider.notifier).fetchFollowedChannels();
      ref.read(discoverChannelsProvider.notifier).fetchChannels();
    });
  }

  @override
  Widget build(BuildContext context) {
    final followedState = ref.watch(followedChannelsProvider);
    final discoverState = ref.watch(discoverChannelsProvider);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        title: Text(
          'Channels',
          style: GoogleFonts.spaceGrotesk(
            fontWeight: FontWeight.bold,
            color: theme.textTheme.bodyLarge?.color,
          ),
        ),
        iconTheme: IconThemeData(color: theme.iconTheme.color),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Following',
              style: GoogleFonts.poppins(
                color: theme.textTheme.bodyLarge?.color,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildFollowedSection(followedState, isDark),
            const SizedBox(height: 32),
            Text(
              'Discover Channels',
              style: GoogleFonts.poppins(
                color: theme.textTheme.bodyLarge?.color,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildDiscoverSection(discoverState, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildFollowedSection(AsyncValue<List<Channel>> state, bool isDark) {
    return state.when(
      loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFFE23B3B))),
      error: (err, stack) => Text('Error: $err', style: const TextStyle(color: Colors.red)),
      data: (channels) {
        if (channels.isEmpty) {
          return Center(
            child: Text(
              'You are not following any channels yet.',
              style: GoogleFonts.poppins(color: const Color(0xFF6B7280)),
            ),
          );
        }
        return SizedBox(
          height: 120,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: channels.length,
            itemBuilder: (context, index) {
              final channel = channels[index];
              return Padding(
                padding: const EdgeInsets.only(right: 16.0),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 36,
                      backgroundColor: isDark ? const Color(0xFF1D2035) : Colors.grey[200],
                      backgroundImage: channel.logoUrl != null ? NetworkImage(channel.logoUrl!) : null,
                      child: channel.logoUrl == null 
                          ? Icon(Icons.business, color: isDark ? Colors.white : Colors.black87) 
                          : null,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      channel.name,
                      style: GoogleFonts.poppins(
                        color: Theme.of(context).textTheme.bodyLarge?.color, 
                        fontSize: 12
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildDiscoverSection(AsyncValue<List<Channel>> state, bool isDark) {
    return state.when(
      loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFFE23B3B))),
      error: (err, stack) => Text('Error: $err', style: const TextStyle(color: Colors.red)),
      data: (channels) {
        if (channels.isEmpty) {
          return Center(
            child: Text('No channels to discover.', 
              style: TextStyle(color: Theme.of(context).textTheme.bodyLarge?.color)
            )
          );
        }
        return ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: channels.length,
          itemBuilder: (context, index) {
            final channel = channels[index];
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1D2035) : Colors.white,
                boxShadow: isDark ? null : [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                ],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: isDark ? const Color(0xFF0A0E21) : Colors.grey[100],
                    backgroundImage: channel.logoUrl != null ? NetworkImage(channel.logoUrl!) : null,
                    child: channel.logoUrl == null 
                        ? Icon(Icons.business, color: isDark ? Colors.white : Colors.black87) 
                        : null,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      channel.name,
                      style: GoogleFonts.poppins(
                        color: Theme.of(context).textTheme.bodyLarge?.color, 
                        fontWeight: FontWeight.w600, 
                        fontSize: 16
                      ),
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      ref.read(discoverChannelsProvider.notifier).toggleFollow(channel.id);
                      // In a real app we'd refresh followedChannelsProvider too, or keep them in sync
                      ref.read(followedChannelsProvider.notifier).fetchFollowedChannels();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: channel.isFollowed ? Colors.transparent : const Color(0xFFE23B3B),
                      side: channel.isFollowed ? const BorderSide(color: Color(0xFFE23B3B)) : BorderSide.none,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      elevation: 0,
                    ),
                    child: Text(
                      channel.isFollowed ? 'Following' : 'Follow',
                      style: GoogleFonts.poppins(
                        color: channel.isFollowed ? const Color(0xFFE23B3B) : Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
