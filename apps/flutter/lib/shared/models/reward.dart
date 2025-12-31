import 'package:freezed_annotation/freezed_annotation.dart';

part 'reward.freezed.dart';
part 'reward.g.dart';

/// Reward model.
@freezed
class Reward with _$Reward {
  const factory Reward({
    required String id,
    required String title,
    String? description,
    required int pointsCost,
    required bool isActive,
    String? imageUrl,
    String? householdId,
    required String createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _Reward;

  factory Reward.fromJson(Map<String, dynamic> json) => _$RewardFromJson(json);
}

/// Reward redemption model.
@freezed
class RewardRedemption with _$RewardRedemption {
  const factory RewardRedemption({
    required String id,
    required String rewardId,
    required String userId,
    required int pointsSpent,
    required String status,
    DateTime? redeemedAt,
    DateTime? fulfilledAt,
    String? fulfilledBy,
    DateTime? createdAt,
  }) = _RewardRedemption;

  factory RewardRedemption.fromJson(Map<String, dynamic> json) =>
      _$RewardRedemptionFromJson(json);
}

/// Redemption status enumeration.
enum RedemptionStatus {
  pending,
  fulfilled,
  cancelled,
}

/// Create reward request model.
@freezed
class CreateRewardRequest with _$CreateRewardRequest {
  const factory CreateRewardRequest({
    required String title,
    String? description,
    required int pointsCost,
    String? imageUrl,
  }) = _CreateRewardRequest;

  factory CreateRewardRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateRewardRequestFromJson(json);
}

/// Update reward request model.
@freezed
class UpdateRewardRequest with _$UpdateRewardRequest {
  const factory UpdateRewardRequest({
    String? title,
    String? description,
    int? pointsCost,
    bool? isActive,
    String? imageUrl,
  }) = _UpdateRewardRequest;

  factory UpdateRewardRequest.fromJson(Map<String, dynamic> json) =>
      _$UpdateRewardRequestFromJson(json);
}
