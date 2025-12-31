import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/api/api_client.dart';

/// Provider for the reward repository.
final rewardRepositoryProvider = Provider<RewardRepository>((ref) {
  return RewardRepository(ref.watch(apiClientProvider));
});

/// Repository for reward operations.
class RewardRepository {
  const RewardRepository(this._apiClient);

  final ApiClient _apiClient;

  /// Fetches all rewards.
  Future<List<Reward>> getRewards() async {
    final response = await _apiClient.get<List<dynamic>>(
      ApiConstants.rewards,
    );
    return response
        .map((json) => Reward.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Fetches a single reward by ID.
  Future<Reward> getReward(String id) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiConstants.reward(id),
    );
    return Reward.fromJson(response);
  }

  /// Creates a new reward.
  Future<Reward> createReward(CreateRewardRequest request) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.rewards,
      data: request.toJson(),
    );
    return Reward.fromJson(response);
  }

  /// Updates an existing reward.
  Future<Reward> updateReward(String id, UpdateRewardRequest request) async {
    final response = await _apiClient.patch<Map<String, dynamic>>(
      ApiConstants.reward(id),
      data: request.toJson(),
    );
    return Reward.fromJson(response);
  }

  /// Deletes a reward.
  Future<void> deleteReward(String id) async {
    await _apiClient.delete(ApiConstants.reward(id));
  }

  /// Redeems a reward.
  Future<RewardRedemption> redeemReward(String id) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.rewardRedeem(id),
    );
    return RewardRedemption.fromJson(response);
  }
}
