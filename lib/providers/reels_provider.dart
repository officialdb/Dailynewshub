import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/reel.dart';
import '../services/reels_service.dart';
import 'dart:async';

final reelsServiceProvider = Provider<ReelsService>((ref) {
  return ReelsService();
});

final reelsProvider = AsyncNotifierProvider<ReelsNotifier, List<Reel>>(() {
  return ReelsNotifier();
});

class ReelsNotifier extends AsyncNotifier<List<Reel>> {
  String? _token;

  void setToken(String? token) {
    _token = token;
  }

  @override
  FutureOr<List<Reel>> build() async {
    // Initial data is usually fetched here, but we will call fetchReels manually when token is set.
    return []; 
  }

  Future<void> fetchReels() async {
    state = const AsyncLoading();
    try {
      final service = ref.read(reelsServiceProvider);
      final reels = await service.getReels(token: _token);
      state = AsyncData(reels);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || state.hasError) return;
    
    final currentList = state.value ?? [];
    try {
      final service = ref.read(reelsServiceProvider);
      final moreReels = await service.getReels(token: _token, skip: currentList.length);
      state = AsyncData([...currentList, ...moreReels]);
    } catch (e) {
      // Keep current state on error
    }
  }

  Future<void> toggleLike(String reelId) async {
    if (state.value == null) return;
    
    final currentList = List<Reel>.from(state.value!);
    final index = currentList.indexWhere((r) => r.id == reelId);
    if (index == -1) return;

    final reel = currentList[index];
    final wasLiked = reel.isLiked;

    // Optimistic update
    currentList[index] = reel.copyWith(
      isLiked: !wasLiked,
      likeCount: reel.likeCount + (wasLiked ? -1 : 1),
    );
    state = AsyncData(currentList);

    try {
      final service = ref.read(reelsServiceProvider);
      if (wasLiked) {
        await service.unlikeReel(reelId, token: _token);
      } else {
        await service.likeReel(reelId, token: _token);
      }
    } catch (e) {
      // Revert on error
      final revertList = List<Reel>.from(state.value ?? currentList);
      final revertIndex = revertList.indexWhere((r) => r.id == reelId);
      if (revertIndex != -1) {
        revertList[revertIndex] = reel; 
        state = AsyncData(revertList);
      }
    }
  }

  void incrementCommentCount(String reelId) {
    if (state.value == null) return;
    
    final currentList = List<Reel>.from(state.value!);
    final index = currentList.indexWhere((r) => r.id == reelId);
    if (index == -1) return;

    final reel = currentList[index];
    currentList[index] = reel.copyWith(
      commentCount: reel.commentCount + 1,
    );
    state = AsyncData(currentList);
  }
}
