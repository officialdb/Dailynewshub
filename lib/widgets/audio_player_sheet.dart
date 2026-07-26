import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:google_fonts/google_fonts.dart';

void showAudioPlayer(
  BuildContext context,
  String audioUrl,
  String articleTitle,
) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _AudioPlayerSheet(
      audioUrl: audioUrl,
      articleTitle: articleTitle,
    ),
  );
}

class _AudioPlayerSheet extends StatefulWidget {
  final String audioUrl;
  final String articleTitle;
  const _AudioPlayerSheet({
    required this.audioUrl,
    required this.articleTitle,
  });

  @override
  State<_AudioPlayerSheet> createState() => _AudioPlayerSheetState();
}

class _AudioPlayerSheetState extends State<_AudioPlayerSheet> {
  final AudioPlayer _player = AudioPlayer();
  PlayerState _state = PlayerState.stopped;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;

  @override
  void initState() {
    super.initState();
    _player.onPlayerStateChanged.listen((s) {
      if (mounted) setState(() => _state = s);
    });
    _player.onPositionChanged.listen((p) {
      if (mounted) setState(() => _position = p);
    });
    _player.onDurationChanged.listen((d) {
      if (mounted) setState(() => _duration = d);
    });
    _player.play(UrlSource(widget.audioUrl));
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes.toString().padLeft(2, '0');
    final seconds = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final maxSeconds = _duration.inSeconds.toDouble();
    final positionSeconds = _position.inSeconds.toDouble();

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.cardTheme.color ?? theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 24),
          Icon(Icons.headphones,
              color: theme.colorScheme.primary, size: 48),
          const SizedBox(height: 16),
          Text(
            widget.articleTitle,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.spaceGrotesk(
              color: theme.textTheme.bodyLarge?.color,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 24),
          Slider(
            value: positionSeconds.clamp(0.0, maxSeconds > 0 ? maxSeconds : 1.0),
            max: maxSeconds > 0 ? maxSeconds : 1.0,
            activeColor: theme.colorScheme.primary,
            inactiveColor:
                theme.colorScheme.onSurface.withValues(alpha: 0.2),
            onChanged: (val) =>
                _player.seek(Duration(seconds: val.toInt())),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _formatDuration(_position),
                  style: GoogleFonts.poppins(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    fontSize: 12,
                  ),
                ),
                Text(
                  _formatDuration(_duration),
                  style: GoogleFonts.poppins(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.replay_10, size: 32),
                color: theme.textTheme.bodyLarge?.color,
                onPressed: () => _player
                    .seek(_position - const Duration(seconds: 10)),
              ),
              const SizedBox(width: 16),
              GestureDetector(
                onTap: () {
                  if (_state == PlayerState.playing) {
                    _player.pause();
                  } else {
                    _player.resume();
                  }
                },
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _state == PlayerState.playing
                        ? Icons.pause
                        : Icons.play_arrow,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              IconButton(
                icon: const Icon(Icons.forward_10, size: 32),
                color: theme.textTheme.bodyLarge?.color,
                onPressed: () => _player
                    .seek(_position + const Duration(seconds: 10)),
              ),
            ],
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
