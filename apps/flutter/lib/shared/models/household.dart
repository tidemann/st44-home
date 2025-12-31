import 'package:freezed_annotation/freezed_annotation.dart';

import 'user.dart';

part 'household.freezed.dart';
part 'household.g.dart';

/// Household model.
@freezed
class Household with _$Household {
  const factory Household({
    required String id,
    required String name,
    required String ownerId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _Household;

  factory Household.fromJson(Map<String, dynamic> json) =>
      _$HouseholdFromJson(json);
}

/// Household member model.
@freezed
class HouseholdMember with _$HouseholdMember {
  const factory HouseholdMember({
    required String id,
    required String householdId,
    required String userId,
    required String role,
    required int totalPoints,
    DateTime? joinedAt,
    User? user,
  }) = _HouseholdMember;

  factory HouseholdMember.fromJson(Map<String, dynamic> json) =>
      _$HouseholdMemberFromJson(json);
}

/// Child profile model.
@freezed
class ChildProfile with _$ChildProfile {
  const factory ChildProfile({
    required String id,
    required String name,
    String? avatarUrl,
    required int totalPoints,
    String? userId,
    required String householdId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _ChildProfile;

  factory ChildProfile.fromJson(Map<String, dynamic> json) =>
      _$ChildProfileFromJson(json);
}

/// Create household request model.
@freezed
class CreateHouseholdRequest with _$CreateHouseholdRequest {
  const factory CreateHouseholdRequest({
    required String name,
  }) = _CreateHouseholdRequest;

  factory CreateHouseholdRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateHouseholdRequestFromJson(json);
}

/// Add child request model.
@freezed
class AddChildRequest with _$AddChildRequest {
  const factory AddChildRequest({
    required String name,
    String? avatarUrl,
  }) = _AddChildRequest;

  factory AddChildRequest.fromJson(Map<String, dynamic> json) =>
      _$AddChildRequestFromJson(json);
}
