import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/channel.dart';
import '../services/channels_service.dart';
import 'dart:async';

final channelsServiceProvider = Provider<ChannelsService>((ref) {
  return ChannelsService();
});

final followedChannelsProvider = AsyncNotifierProvider<FollowedChannelsNotifier, List<Channel>>(() {
  return FollowedChannelsNotifier();
});

final discoverChannelsProvider = AsyncNotifierProvider<DiscoverChannelsNotifier, List<Channel>>(() {
  return DiscoverChannelsNotifier();
});


class FollowedChannelsNotifier extends AsyncNotifier<List<Channel>> {
  String? _token;

  void setToken(String? token) {
    _token = token;
  }

  @override
  FutureOr<List<Channel>> build() async {
    return [];
  }

  Future<void> fetchFollowedChannels() async {
    state = const AsyncLoading();
    try {
      final service = ref.read(channelsServiceProvider);
      final channels = await service.getFollowedChannels(token: _token);
      state = AsyncData(channels);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }
}

class DiscoverChannelsNotifier extends AsyncNotifier<List<Channel>> {
  String? _token;

  void setToken(String? token) {
    _token = token;
  }

  @override
  FutureOr<List<Channel>> build() async {
    return [];
  }

  Future<void> fetchChannels() async {
    state = const AsyncLoading();
    try {
      final service = ref.read(channelsServiceProvider);
      final channels = await service.getChannels(token: _token);
      state = AsyncData(channels);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> toggleFollow(String channelId) async {
    if (state.value == null) return;
    
    final currentList = List<Channel>.from(state.value!);
    final index = currentList.indexWhere((c) => c.id == channelId);
    if (index == -1) return;

    final channel = currentList[index];
    final wasFollowed = channel.isFollowed;

    // Optimistic update
    currentList[index] = channel.copyWith(isFollowed: !wasFollowed);
    state = AsyncData(currentList);

    try {
      final service = ref.read(channelsServiceProvider);
      if (wasFollowed) {
        await service.unfollowChannel(channelId, token: _token);
      } else {
        await service.followChannel(channelId, token: _token);
      }
    } catch (e) {
      // Revert on error
      final revertList = List<Channel>.from(state.value ?? currentList);
      final revertIndex = revertList.indexWhere((c) => c.id == channelId);
      if (revertIndex != -1) {
        revertList[revertIndex] = channel;
        state = AsyncData(revertList);
      }
    }
  }
}
