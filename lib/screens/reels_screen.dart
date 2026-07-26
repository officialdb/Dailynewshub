import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:http/http.dart' as http;
import 'package:youtube_player_iframe/youtube_player_iframe.dart';

import '../providers/reels_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/channels_provider.dart';
import '../services/channels_service.dart';
import '../services/news_api_service.dart';
import '../config/api_config.dart';
import '../models/reel.dart';
import '../widgets/comment_bottom_sheet.dart';

class ReelsScreen extends ConsumerStatefulWidget {
  final bool isActive;

  const ReelsScreen({super.key, this.isActive = true});

  @override
  ConsumerState<ReelsScreen> createState() => _ReelsScreenState();
}

class _ReelsScreenState extends ConsumerState<ReelsScreen> {
  final PageController _pageController = PageController();
  final Map<int, YoutubePlayerController> _controllers = {};
  final Set<String> _seenReelIds = {};
  int _currentPage = 0;
  bool _initialFetchDone = false;

  @override
  void initState() {
    super.initState();
    _pageController.addListener(_onPageChanged);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authState = ref.read(authProvider);
      final token = authState.user?.accessToken;
      ref.read(reelsProvider.notifier).setToken(token);
      ref.read(reelsProvider.notifier).fetchReels().then((_) {
        _initControllerForIndex(0);
        _initControllerForIndex(1);
        if (mounted) setState(() {});
      });
      // Load followed channels for the Follow button state
      ref.read(followedChannelsProvider.notifier).setToken(token);
      ref.read(followedChannelsProvider.notifier).fetchFollowedChannels();
    });
  }

  void _onPageChanged() {
    final page = _pageController.page?.round() ?? 0;
    if (page != _currentPage) {
      _controllers[_currentPage]?.pauseVideo();
      _currentPage = page;
      _controllers[_currentPage]?.playVideo();
      _initControllerForIndex(page + 1);
      _initControllerForIndex(page - 1);
      _disposeControllersOutsideRange(page);
      setState(() {});

      final reels = ref.read(reelsProvider).value ?? [];

      // Mark current and nearby reels as seen
      for (int i = max(0, page - 1);
          i < min(reels.length, page + 2);
          i++) {
        _seenReelIds.add(reels[i].id);
      }

      // Load more when approaching the end
      if (page >= reels.length - 2) {
        ref.read(reelsProvider.notifier).loadMore();
      }
    }
  }

  YoutubePlayerController? _initControllerForIndex(int index) {
    final reels = ref.read(reelsProvider).value ?? [];
    if (index < 0 || index >= reels.length) return null;
    if (_controllers.containsKey(index)) return _controllers[index];

    final controller = YoutubePlayerController.fromVideoId(
      videoId: reels[index].youtubeVideoId,
      autoPlay: index == _currentPage && widget.isActive,
      params: const YoutubePlayerParams(
        showControls: false,
        showFullscreenButton: false,
        showVideoAnnotations: false,
        loop: false,
        strictRelatedVideos: true,
        // pointerEvents.none lets our Flutter overlays receive taps
        pointerEvents: PointerEvents.none,
        playsInline: true,
        enableCaption: false,
      ),
    );
    _controllers[index] = controller;
    return controller;
  }

  void _disposeControllersOutsideRange(int currentIndex) {
    final toRemove = _controllers.keys
        .where((i) => (i - currentIndex).abs() > 1)
        .toList();
    for (final i in toRemove) {
      _controllers[i]?.close();
      _controllers.remove(i);
    }
  }

  Future<void> _refresh() async {
    // Dispose all existing controllers before fetching new videos
    for (final c in _controllers.values) {
      c.close();
    }
    _controllers.clear();
    _currentPage = 0;
    if (_pageController.hasClients) {
      _pageController.jumpToPage(0);
    }

    final authState = ref.read(authProvider);
    ref.read(reelsProvider.notifier).setToken(authState.user?.accessToken);
    await ref.read(reelsProvider.notifier).fetchReels();

    _initControllerForIndex(0);
    _initControllerForIndex(1);
    if (mounted) setState(() {});
  }

  @override
  void didUpdateWidget(ReelsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive != oldWidget.isActive) {
      if (widget.isActive) {
        // Tab became active — only resume video, don't re-fetch
        // (prevents showing the same reels over and over)
        if (_controllers.containsKey(_currentPage)) {
          _controllers[_currentPage]?.playVideo();
        }
      } else {
        _controllers[_currentPage]?.pauseVideo();
      }
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.close();
    }
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reelsAsync = ref.watch(reelsProvider);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: Colors.black,
        extendBodyBehindAppBar: true,
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(kToolbarHeight),
          child: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            scrolledUnderElevation: 0,
            title: Text(
              'News Reels',
              style: GoogleFonts.spaceGrotesk(
                fontWeight: FontWeight.bold,
                color: Colors.white,
                fontSize: 18,
              ),
            ),
            centerTitle: true,
          ),
        ),
        body: reelsAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: Color(0xFFE23B3B)),
          ),
          error: (err, _) => Center(
            child: Text('Error: $err', style: const TextStyle(color: Colors.white)),
          ),
          data: (reels) {
            if (reels.isEmpty) {
              return RefreshIndicator(
                color: const Color(0xFFE23B3B),
                backgroundColor: const Color(0xFF1D2035),
                onRefresh: _refresh,
                child: const SingleChildScrollView(
                  physics: AlwaysScrollableScrollPhysics(),
                  child: SizedBox(
                    height: 400,
                    child: Center(
                      child: Text(
                        'No reels available\nPull down to refresh',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white70, height: 1.6),
                      ),
                    ),
                  ),
                ),
              );
            }
            return RefreshIndicator(
              color: const Color(0xFFE23B3B),
              backgroundColor: const Color(0xFF1D2035),
              onRefresh: _refresh,
              // Trigger refresh on overscroll at top of vertical PageView
              notificationPredicate: (notification) => notification.depth == 0,
              child: PageView.builder(
                controller: _pageController,
                scrollDirection: Axis.vertical,
                itemCount: reels.length,
                itemBuilder: (context, index) {
                  return ReelPlayerItem(
                    key: ValueKey(reels[index].youtubeVideoId),
                    reel: reels[index],
                    controller: _controllers[index],
                    isActive: (index == _currentPage) && widget.isActive,
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------

class ReelPlayerItem extends ConsumerStatefulWidget {
  final Reel reel;
  final YoutubePlayerController? controller;
  final bool isActive;

  const ReelPlayerItem({
    super.key,
    required this.reel,
    required this.controller,
    required this.isActive,
  });

  @override
  ConsumerState<ReelPlayerItem> createState() => _ReelPlayerItemState();
}

class _ReelPlayerItemState extends ConsumerState<ReelPlayerItem> {
  bool _isPlaying = false;
  bool _showPauseIcon = false;
  bool _isSpeedUp = false;
  String? _seekIndicator;
  StreamSubscription<YoutubePlayerValue>? _sub;

  @override
  void initState() {
    super.initState();
    _attachListener(widget.controller);
    // Explicitly trigger play after the iframe has had time to load.
    // autoPlay:true in the params sets autoplay=1 on the URL, but we also
    // call playVideo() as a safety net in case the event is missed.
    if (widget.isActive) {
      Future.delayed(const Duration(milliseconds: 800), () {
        if (mounted && widget.isActive) {
          widget.controller?.playVideo();
        }
      });
    }
  }

  void _attachListener(YoutubePlayerController? controller) {
    _sub?.cancel();
    _sub = controller?.listen(_onControllerUpdate);
  }

  @override
  void didUpdateWidget(ReelPlayerItem oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Re-attach listener when controller changes
    if (widget.controller != oldWidget.controller) {
      _attachListener(widget.controller);
      setState(() => _isPlaying = false);
    }

    // Respond to active/inactive state changes from the parent
    if (widget.isActive != oldWidget.isActive) {
      if (widget.isActive) {
        // Give iframe a moment then play
        Future.delayed(const Duration(milliseconds: 300), () {
          if (mounted && widget.isActive) widget.controller?.playVideo();
        });
      } else {
        widget.controller?.pauseVideo();
        if (mounted) setState(() => _isPlaying = false);
      }
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  void _onControllerUpdate(YoutubePlayerValue value) {
    if (!mounted) return;
    final playing = value.playerState == PlayerState.playing;
    if (playing != _isPlaying) {
      setState(() => _isPlaying = playing);
    }

    // Resilient autoplay: if the video is supposed to be active but is cued/unstarted, force play.
    if (widget.isActive && !playing) {
      if (value.playerState == PlayerState.cued || value.playerState == PlayerState.unknown) {
        widget.controller?.playVideo();
      }
    }
  }

  void _onTap() {
    if (!_isPlaying) {
      widget.controller?.playVideo();
    } else {
      widget.controller?.pauseVideo();
      setState(() {
        _isPlaying = false;
        _showPauseIcon = true;
      });
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _showPauseIcon = false);
      });
    }
  }

  void _showSeekIndicator(String text) {
    setState(() => _seekIndicator = text);
    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) setState(() => _seekIndicator = null);
    });
  }

  @override
  Widget build(BuildContext context) {
    final currentReel = ref.watch(reelsProvider).value?.firstWhere(
      (r) => r.id == widget.reel.id,
      orElse: () => widget.reel,
    ) ?? widget.reel;

    final size = MediaQuery.of(context).size;
    final isVertical = widget.reel.aspectRatio == '9:16';

    // For 16:9 videos: natural height at full width, centered.
    // For 9:16 videos: full screen.
    final videoH = isVertical ? size.height : size.width * (9 / 16);
    final videoTop = isVertical ? 0.0 : (size.height - videoH) / 2;

    return GestureDetector(
      onTap: _onTap,
      onDoubleTapDown: (details) {
        // FIX 18: Double-tap left/right for seek
        final screenWidth = MediaQuery.of(context).size.width;
        final tapX = details.globalPosition.dx;
        if (tapX > screenWidth / 2) {
          widget.controller?.seekTo(seconds: 10);
          _showSeekIndicator('+10s');
        } else {
          widget.controller?.seekTo(seconds: 0);
          _showSeekIndicator('-10s');
        }
      },
      onLongPressStart: (_) {
        // FIX 18: Long-press for 2x speed
        widget.controller?.setPlaybackRate(2.0);
        setState(() => _isSpeedUp = true);
      },
      onLongPressEnd: (_) {
        widget.controller?.setPlaybackRate(1.0);
        setState(() => _isSpeedUp = false);
      },
      child: Container(
        color: Colors.black,
        child: Column(
          children: [
            // ── Video + overlays area ──
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
            // ── 1. YouTube iframe ──────────────────────────────────────────
            if (widget.controller != null)
              Positioned(
                top: videoTop,
                left: 0,
                right: 0,
                height: videoH,
                child: IgnorePointer(
                  child: YoutubePlayer(controller: widget.controller!),
                ),
              ),

            // ── 2. YouTube overlay masking ────────────────────────────────
            // YouTube injects its own title bar, branding, related videos panel,
            // and seek loop icon into the iframe. Since we cannot remove these
            // via params (YouTube deprecated modestBranding), we mask them with
            // black bars that match the iframe boundaries.
            if (widget.controller != null) ...[
              // Top mask — hides the title/info overlay YouTube shows
              Positioned(
                top: videoTop,
                left: 0,
                right: 0,
                height: 48,
                child: IgnorePointer(
                  child: Container(color: Colors.black),
                ),
              ),
              // Bottom mask — hides YouTube logo, related videos & seek bar
              Positioned(
                top: videoTop + videoH - 52,
                left: 0,
                right: 0,
                height: 52,
                child: IgnorePointer(
                  child: Container(color: Colors.black),
                ),
              ),
              // Left mask — hides the seek-loop circular icon
              Positioned(
                top: videoTop,
                left: 0,
                width: 48,
                height: videoH,
                child: IgnorePointer(
                  child: Container(color: Colors.black),
                ),
              ),
            ],

            if (!_isPlaying)
              Positioned(
                top: videoTop,
                left: 0,
                right: 0,
                height: videoH,
                child: IgnorePointer(
                  child: CachedNetworkImage(
                    imageUrl: widget.reel.thumbnailUrl,
                    fit: BoxFit.cover,
                    placeholder: (_, url) =>
                        Container(color: const Color(0xFF0A0E21)),
                    errorWidget: (_, url, err) =>
                        Container(color: const Color(0xFF0A0E21)),
                  ),
                ),
              ),


            // ── 3. Play button — only shown when paused AND not expecting autoplay ──
            if (!_isPlaying && !widget.isActive)
              Positioned(
                top: videoTop,
                left: 0,
                right: 0,
                height: videoH,
                child: IgnorePointer(
                  child: Center(
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.play_arrow_rounded,
                        color: Colors.white,
                        size: 40,
                      ),
                    ),
                  ),
                ),
              ),

            // ── 4. Pause flash icon ───────────────────────────────────────
            if (_showPauseIcon)
              Positioned(
                top: videoTop,
                left: 0,
                right: 0,
                height: videoH,
                child: IgnorePointer(
                  child: Center(
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.pause_rounded,
                        color: Colors.white,
                        size: 40,
                      ),
                    ),
                  ),
                ),
              ),

            // ── 5. Bottom gradient ────────────────────────────────────────
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              height: size.height * 0.45,
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.75),
                        Colors.black.withValues(alpha: 0.97),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
            ), // close Stack

            // ── Bottom action bar (OUTSIDE Stack for guaranteed visibility) ──
            Container(
              color: Colors.black,
              padding: EdgeInsets.only(
                left: 12,
                right: 12,
                bottom: MediaQuery.of(context).padding.bottom + 8,
                top: 8,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Channel info + Follow button (left side)
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 16,
                              backgroundColor: const Color(0xFF1D2035),
                              backgroundImage:
                                  widget.reel.channelLogoUrl != null
                                      ? NetworkImage(
                                          widget.reel.channelLogoUrl!)
                                      : null,
                              child: widget.reel.channelLogoUrl == null
                                  ? const Icon(Icons.person,
                                      color: Colors.white, size: 16)
                                  : null,
                            ),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                widget.reel.channelName,
                                style: GoogleFonts.poppins(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            // Follow button next to channel name
                            _FollowButton(
                              channelId: widget.reel.channelId,
                              channelName: widget.reel.channelName,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.reel.title,
                          style: GoogleFonts.poppins(
                              color: Colors.white70, fontSize: 12),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  // Action buttons (right side) — more space now
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _ActionButton(
                        icon: currentReel.isLiked
                            ? Icons.favorite
                            : Icons.favorite_border,
                        color: currentReel.isLiked
                            ? const Color(0xFFE23B3B)
                            : Colors.white,
                        label: _fmt(currentReel.likeCount),
                        iconSize: 24,
                        onTap: () {
                          final authState = ref.read(authProvider);
                          if (!authState.isRegistered) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content:
                                    Text('Please log in to like shorts'),
                                backgroundColor: Color(0xFF1D2035),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                            return;
                          }
                          ref
                              .read(reelsProvider.notifier)
                              .toggleLike(widget.reel.id);
                        },
                      ),
                      const SizedBox(width: 12),
                      _ActionButton(
                        icon: Icons.chat_bubble_outline_rounded,
                        color: Colors.white,
                        label: _fmt(currentReel.commentCount),
                        iconSize: 24,
                        onTap: () {
                          widget.controller?.pauseVideo();
                          showTikTokComments(context, widget.reel.id)
                              .whenComplete(() {
                            if (widget.isActive)
                              widget.controller?.playVideo();
                          });
                        },
                      ),
                      const SizedBox(width: 12),
                      _ActionButton(
                        icon: currentReel.isBookmarked
                            ? Icons.bookmark
                            : Icons.bookmark_border,
                        color: currentReel.isBookmarked
                            ? const Color(0xFFFFD700)
                            : Colors.white,
                        label: '',
                        iconSize: 24,
                        onTap: () async {
                          final authState = ref.read(authProvider);
                          if (!authState.isRegistered) return;
                          ref
                              .read(reelsProvider.notifier)
                              .toggleBookmark(widget.reel.id);
                          // Use reel-specific bookmark endpoints
                          try {
                            final baseUrl = ApiConfig.baseUrl;
                            final token = authState.user!.accessToken!;
                            final headers = {
                              'Authorization': 'Bearer $token',
                              'Accept': 'application/json',
                            };
                            if (currentReel.isBookmarked) {
                              await http.delete(
                                Uri.parse(
                                    '$baseUrl/bookmarks/reels/${widget.reel.id}'),
                                headers: headers,
                              );
                            } else {
                              await http.post(
                                Uri.parse(
                                    '$baseUrl/bookmarks/reels/${widget.reel.id}'),
                                headers: headers,
                              );
                            }
                          } catch (_) {}
                        },
                      ),
                      const SizedBox(width: 12),
                      _ActionButton(
                        icon: Icons.reply_rounded,
                        color: Colors.white,
                        label: '',
                        iconSize: 24,
                        onTap: () {},
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _fmt(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }
}

// ---------------------------------------------------------------------------

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final double iconSize;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.color,
    required this.label,
    this.iconSize = 30,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: iconSize),
          if (label.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: iconSize < 28 ? 10 : 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------

class _FollowButton extends ConsumerStatefulWidget {
  final String channelId;
  final String channelName;

  const _FollowButton({
    required this.channelId,
    required this.channelName,
  });

  @override
  ConsumerState<_FollowButton> createState() => _FollowButtonState();
}

class _FollowButtonState extends ConsumerState<_FollowButton> {
  bool _isLoading = false;

  bool get _isFollowing {
    final followed = ref.watch(followedChannelsProvider).value ?? [];
    return followed.any((c) => c.id == widget.channelId);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _isLoading
          ? null
          : () async {
              final authState = ref.read(authProvider);
              if (!authState.isRegistered) return;

              setState(() => _isLoading = true);
              try {
                final service = ChannelsService();
                if (_isFollowing) {
                  await service.unfollowChannel(
                    widget.channelId,
                    token: authState.user?.accessToken,
                  );
                } else {
                  await service.followChannel(
                    widget.channelId,
                    token: authState.user?.accessToken,
                  );
                }
                // Refresh the followed channels list so state persists
                await ref
                    .read(followedChannelsProvider.notifier)
                    .fetchFollowedChannels();
              } catch (_) {
                // Silently handle errors
              } finally {
                if (mounted) {
                  setState(() => _isLoading = false);
                }
              }
            },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: _isFollowing ? const Color(0xFFE23B3B) : Colors.transparent,
          border: Border.all(color: Colors.white, width: 1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white),
              )
            : Text(
                _isFollowing ? 'Following' : 'Follow',
                style: GoogleFonts.poppins(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }
}
