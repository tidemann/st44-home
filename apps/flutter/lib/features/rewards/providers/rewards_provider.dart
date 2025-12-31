import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/models.dart';
import '../../../shared/services/api/api_exception.dart';
import '../data/reward_repository.dart';

/// State for rewards list.
sealed class RewardsState {
  const RewardsState();
}

class RewardsLoading extends RewardsState {
  const RewardsLoading();
}

class RewardsLoaded extends RewardsState {
  const RewardsLoaded(this.rewards);
  final List<Reward> rewards;
}

class RewardsError extends RewardsState {
  const RewardsError(this.message);
  final String message;
}

/// Provider for the rewards list.
final rewardsProvider = StateNotifierProvider<RewardsNotifier, RewardsState>((ref) {
  return RewardsNotifier(ref.watch(rewardRepositoryProvider));
});

/// Notifier for managing rewards state.
class RewardsNotifier extends StateNotifier<RewardsState> {
  RewardsNotifier(this._repository) : super(const RewardsLoading()) {
    loadRewards();
  }

  final RewardRepository _repository;

  /// Loads all rewards.
  Future<void> loadRewards() async {
    state = const RewardsLoading();
    try {
      final rewards = await _repository.getRewards();
      state = RewardsLoaded(rewards);
    } on ApiException catch (e) {
      state = RewardsError(e.message);
    } catch (e) {
      state = RewardsError('Failed to load rewards');
    }
  }

  /// Refreshes the rewards list.
  Future<void> refresh() => loadRewards();

  /// Creates a new reward.
  Future<bool> createReward(CreateRewardRequest request) async {
    try {
      await _repository.createReward(request);
      await loadRewards();
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Deletes a reward.
  Future<bool> deleteReward(String id) async {
    try {
      await _repository.deleteReward(id);
      await loadRewards();
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Redeems a reward.
  Future<bool> redeemReward(String id) async {
    try {
      await _repository.redeemReward(id);
      await loadRewards();
      return true;
    } catch (e) {
      return false;
    }
  }
}

/// Provider for active rewards only.
final activeRewardsProvider = Provider<List<Reward>>((ref) {
  final state = ref.watch(rewardsProvider);
  if (state is RewardsLoaded) {
    return state.rewards.where((r) => r.isActive).toList();
  }
  return [];
});
