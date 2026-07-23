import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart' as legacy_provider;

import '../models/reel_comment.dart';
import '../services/reels_service.dart';
import '../providers/auth_provider.dart';
import '../providers/reels_provider.dart';

// ── State ──────────────────────────────────────────────────────────────────

final _reelCommentsFamily =
    AsyncNotifierProvider.family<_CommentsNotifier, List<ReelComment>, String>(
  _CommentsNotifier.new,
);

class _CommentsNotifier extends AsyncNotifier<List<ReelComment>> {
  final String reelId;
  final ReelsService _svc = ReelsService();

  _CommentsNotifier(this.reelId);

  @override
  Future<List<ReelComment>> build() async {
    return _svc.getReelComments(reelId);
  }

  Future<ReelComment?> postComment(String text, {String? parentId}) async {
    try {
      final comment = await _svc.addComment(reelId, text, parentId: parentId);
      final current = state.value ?? [];
      List<ReelComment> updated;
      if (parentId == null) {
        updated = [comment, ...current];
      } else {
        updated = current.map((c) {
          if (c.id == parentId) {
            return c.copyWith(replies: [...c.replies, comment]);
          }
          return c;
        }).toList();
      }
      state = AsyncData(updated);
      return comment;
    } catch (_) {
      return null;
    }
  }

  Future<void> toggleLike(String commentId, bool currentlyLiked) async {
    final currentList = state.value ?? [];

    ReelComment updateInList(ReelComment c) {
      if (c.id == commentId) {
        return c.copyWith(
          isLiked: !currentlyLiked,
          likeCount: currentlyLiked ? c.likeCount - 1 : c.likeCount + 1,
        );
      }
      final updatedReplies = c.replies.map((r) {
        if (r.id == commentId) {
          return r.copyWith(
            isLiked: !currentlyLiked,
            likeCount: currentlyLiked ? r.likeCount - 1 : r.likeCount + 1,
          );
        }
        return r;
      }).toList();
      return c.copyWith(replies: updatedReplies);
    }

    // Optimistic update
    state = AsyncData(currentList.map(updateInList).toList());

    try {
      if (currentlyLiked) {
        await _svc.unlikeComment(reelId, commentId);
      } else {
        await _svc.likeComment(reelId, commentId);
      }
    } catch (_) {
      // Revert on failure
      state = AsyncData(currentList);
    }
  }
}

// ── Public entry point ─────────────────────────────────────────────────────

Future<void> showTikTokComments(BuildContext context, String reelId) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withOpacity(0.5),
    builder: (context) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ProviderScope(child: _CommentsSheet(reelId: reelId)),
    ),
  );
}

// ── Bottom sheet ───────────────────────────────────────────────────────────

class _CommentsSheet extends ConsumerStatefulWidget {
  final String reelId;
  const _CommentsSheet({required this.reelId});

  @override
  ConsumerState<_CommentsSheet> createState() => _CommentsSheetState();
}

class _CommentsSheetState extends ConsumerState<_CommentsSheet> {
  final TextEditingController _inputController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  bool _isSubmitting = false;
  // When set, we're replying to this comment
  ReelComment? _replyingTo;

  @override
  void dispose() {
    _inputController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _startReply(ReelComment comment) {
    setState(() => _replyingTo = comment);
    _inputController.text = '';
    _focusNode.requestFocus();
  }

  void _cancelReply() {
    setState(() => _replyingTo = null);
    _inputController.clear();
    _focusNode.unfocus();
  }

  Future<void> _submitComment() async {
    final text = _inputController.text.trim();
    if (text.isEmpty || _isSubmitting) return;

    final auth = legacy_provider.Provider.of<AuthProvider>(context, listen: false);
    if (!auth.isRegistered) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please log in to comment'),
          backgroundColor: Color(0xFF1D2035),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await ref.read(_reelCommentsFamily(widget.reelId).notifier).postComment(
            text,
            parentId: _replyingTo?.id,
          );
      // Increment the comment count on the Reel to update UI immediately
      if (_replyingTo == null) {
        ref.read(reelsProvider.notifier).incrementCommentCount(widget.reelId);
      }

      _inputController.clear();
      setState(() => _replyingTo = null);
      _focusNode.unfocus();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to post comment')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      snap: true,
      snapSizes: const [0.6, 0.95],
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: theme.scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Drag handle
              Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFF6B7280),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Comments',
                      style: GoogleFonts.poppins(
                        color: theme.textTheme.bodyLarge?.color,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: theme.iconTheme.color),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(color: Color(0xFF6B7280), height: 1),

              // Comment list
              Expanded(
                child: Consumer(
                  builder: (context, ref, _) {
                    final commentsAsync = ref.watch(_reelCommentsFamily(widget.reelId));
                    return commentsAsync.when(
                      loading: () => _buildShimmerList(),
                      error: (e, _) => Center(
                        child: Text(
                          'Failed to load comments',
                          style: GoogleFonts.poppins(color: const Color(0xFF6B7280)),
                        ),
                      ),
                      data: (comments) => comments.isEmpty
                          ? _buildEmptyState()
                          : ListView.builder(
                              controller: scrollController,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              itemCount: comments.length,
                              itemBuilder: (context, index) {
                                return _CommentTile(
                                  comment: comments[index],
                                  reelId: widget.reelId,
                                  onReply: _startReply,
                                );
                              },
                            ),
                    );
                  },
                ),
              ),

              // Reply banner
              if (_replyingTo != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: isDark ? const Color(0xFF0A0E21) : Colors.grey[200],
                  child: Row(
                    children: [
                      const Icon(Icons.reply, color: Color(0xFFE23B3B), size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Replying to ${_replyingTo!.userName}',
                          style: GoogleFonts.poppins(
                            color: const Color(0xFF6B7280),
                            fontSize: 12,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: _cancelReply,
                        child: const Icon(Icons.close, color: Color(0xFF6B7280), size: 16),
                      ),
                    ],
                  ),
                ),

              // Input bar
              _CommentInputBar(
                controller: _inputController,
                focusNode: _focusNode,
                isSubmitting: _isSubmitting,
                onSubmit: _submitComment,
                placeholder:
                    _replyingTo != null ? 'Reply to ${_replyingTo!.userName}...' : 'Add a comment...',
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.chat_bubble_outline, color: Color(0xFF6B7280), size: 48),
          const SizedBox(height: 12),
          Text('No comments yet', style: GoogleFonts.poppins(color: Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black, fontWeight: FontWeight.bold)),
          Text('Be the first to comment',
              style: GoogleFonts.poppins(color: const Color(0xFF6B7280), fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildShimmerList() {
    return ListView.builder(
      itemCount: 6,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemBuilder: (_, __) => const _ShimmerCommentTile(),
    );
  }
}

// ── Comment tile ───────────────────────────────────────────────────────────

class _CommentTile extends ConsumerWidget {
  final ReelComment comment;
  final String reelId;
  final void Function(ReelComment) onReply;

  const _CommentTile({
    required this.comment,
    required this.reelId,
    required this.onReply,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar
              _UserAvatar(name: comment.userName, avatarUrl: comment.userAvatarUrl, radius: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Name + time
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            comment.userName,
                            style: GoogleFonts.poppins(
                              color: Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _timeAgo(comment.timestamp),
                          style: GoogleFonts.poppins(
                            color: const Color(0xFF6B7280),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    // Text
                    Text(
                      comment.text,
                      style: GoogleFonts.poppins(
                        color: Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black87,
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 6),
                    // Action row: Reply | Like count
                    Row(
                      children: [
                        GestureDetector(
                          onTap: () => onReply(comment),
                          child: Text(
                            'Reply',
                            style: GoogleFonts.poppins(
                              color: const Color(0xFF6B7280),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // Like button
              _LikeButton(
                commentId: comment.id,
                reelId: reelId,
                likeCount: comment.likeCount,
                isLiked: comment.isLiked,
              ),
            ],
          ),

          // Replies (indented)
          if (comment.replies.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 46, top: 8),
              child: Column(
                children: comment.replies
                    .map((r) => _ReplyTile(reply: r, reelId: reelId))
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return '${diff.inSeconds}s';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    return '${diff.inDays}d';
  }
}

// ── Reply tile ─────────────────────────────────────────────────────────────

class _ReplyTile extends ConsumerWidget {
  final ReelComment reply;
  final String reelId;
  const _ReplyTile({required this.reply, required this.reelId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _UserAvatar(name: reply.userName, avatarUrl: reply.userAvatarUrl, radius: 14),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        reply.userName,
                        style: GoogleFonts.poppins(
                          color: Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _timeAgo(reply.timestamp),
                      style: GoogleFonts.poppins(color: const Color(0xFF6B7280), fontSize: 10),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  reply.text,
                  style: GoogleFonts.poppins(
                    color: Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black87,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          _LikeButton(
            commentId: reply.id,
            reelId: reelId,
            likeCount: reply.likeCount,
            isLiked: reply.isLiked,
            iconSize: 16,
          ),
        ],
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return '${diff.inSeconds}s';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    return '${diff.inDays}d';
  }
}

// ── Like button ────────────────────────────────────────────────────────────

class _LikeButton extends ConsumerWidget {
  final String commentId;
  final String reelId;
  final int likeCount;
  final bool isLiked;
  final double iconSize;

  const _LikeButton({
    required this.commentId,
    required this.reelId,
    required this.likeCount,
    required this.isLiked,
    this.iconSize = 18,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () {
        final auth = legacy_provider.Provider.of<AuthProvider>(context, listen: false);
        if (!auth.isRegistered) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please log in to like comments'),
              backgroundColor: Color(0xFF1D2035),
              behavior: SnackBarBehavior.floating,
            ),
          );
          return;
        }
        ref.read(_reelCommentsFamily(reelId).notifier).toggleLike(commentId, isLiked);
      },
      child: Padding(
        padding: const EdgeInsets.only(left: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isLiked ? Icons.favorite : Icons.favorite_border,
              color: isLiked ? const Color(0xFFE23B3B) : const Color(0xFF6B7280),
              size: iconSize,
            ),
            if (likeCount > 0)
              Text(
                likeCount.toString(),
                style: GoogleFonts.poppins(
                  color: const Color(0xFF6B7280),
                  fontSize: 10,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Avatar ─────────────────────────────────────────────────────────────────

class _UserAvatar extends StatelessWidget {
  final String name;
  final String? avatarUrl;
  final double radius;

  const _UserAvatar({required this.name, this.avatarUrl, this.radius = 18});

  @override
  Widget build(BuildContext context) {
    final initials = name.isNotEmpty ? name[0].toUpperCase() : '?';
    if (avatarUrl != null && avatarUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: radius,
        backgroundColor: const Color(0xFF6B7280),
        child: ClipOval(
          child: CachedNetworkImage(
            imageUrl: avatarUrl!,
            width: radius * 2,
            height: radius * 2,
            fit: BoxFit.cover,
            errorWidget: (_, __, ___) => Text(
              initials,
              style: TextStyle(color: Colors.white, fontSize: radius * 0.8),
            ),
          ),
        ),
      );
    }
    // No avatar: show coloured initial
    return CircleAvatar(
      radius: radius,
      backgroundColor: _colorFromName(name),
      child: Text(
        initials,
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: radius * 0.8,
        ),
      ),
    );
  }

  Color _colorFromName(String n) {
    final colors = [
      const Color(0xFFE23B3B),
      const Color(0xFF3B82F6),
      const Color(0xFF10B981),
      const Color(0xFFF59E0B),
      const Color(0xFF8B5CF6),
      const Color(0xFF06B6D4),
    ];
    return colors[n.codeUnitAt(0) % colors.length];
  }
}

// ── Input bar ──────────────────────────────────────────────────────────────

class _CommentInputBar extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool isSubmitting;
  final VoidCallback onSubmit;
  final String placeholder;

  const _CommentInputBar({
    required this.controller,
    required this.focusNode,
    required this.isSubmitting,
    required this.onSubmit,
    this.placeholder = 'Add a comment...',
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.only(
        left: 16,
        right: 16,
        top: 10,
        bottom: 16,
      ),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        border: Border(top: BorderSide(color: isDark ? const Color(0xFF6B7280) : Colors.grey[300]!, width: 0.5)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              focusNode: focusNode,
              style: GoogleFonts.poppins(color: theme.textTheme.bodyLarge?.color, fontSize: 14),
              decoration: InputDecoration(
                hintText: placeholder,
                hintStyle: GoogleFonts.poppins(color: const Color(0xFF6B7280), fontSize: 14),
                filled: true,
                fillColor: isDark ? const Color(0xFF0A0E21) : Colors.grey[200],
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
              ),
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => onSubmit(),
            ),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: onSubmit,
            child: Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(
                color: Color(0xFFE23B3B),
                shape: BoxShape.circle,
              ),
              child: isSubmitting
                  ? const Padding(
                      padding: EdgeInsets.all(10),
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.send, color: Colors.white, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Shimmer placeholder ────────────────────────────────────────────────────

class _ShimmerCommentTile extends StatelessWidget {
  const _ShimmerCommentTile();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36, height: 36,
            decoration: const BoxDecoration(color: Color(0xFF2D3150), shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(width: 100, height: 12,
                    decoration: BoxDecoration(color: const Color(0xFF2D3150), borderRadius: BorderRadius.circular(6))),
                const SizedBox(height: 6),
                Container(width: double.infinity, height: 12,
                    decoration: BoxDecoration(color: const Color(0xFF2D3150), borderRadius: BorderRadius.circular(6))),
                const SizedBox(height: 4),
                Container(width: 180, height: 12,
                    decoration: BoxDecoration(color: const Color(0xFF2D3150), borderRadius: BorderRadius.circular(6))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
