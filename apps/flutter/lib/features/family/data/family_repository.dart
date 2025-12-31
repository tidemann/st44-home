import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/api/api_client.dart';

/// Provider for the family repository.
final familyRepositoryProvider = Provider<FamilyRepository>((ref) {
  return FamilyRepository(ref.watch(apiClientProvider));
});

/// Repository for family/household operations.
class FamilyRepository {
  const FamilyRepository(this._apiClient);

  final ApiClient _apiClient;

  /// Gets the current household.
  Future<Household> getHousehold(String id) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiConstants.household(id),
    );
    return Household.fromJson(response);
  }

  /// Gets household members.
  Future<List<HouseholdMember>> getHouseholdMembers(String householdId) async {
    final response = await _apiClient.get<List<dynamic>>(
      ApiConstants.householdMembers(householdId),
    );
    return response
        .map((json) => HouseholdMember.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Gets children in the household.
  Future<List<ChildProfile>> getHouseholdChildren(String householdId) async {
    final response = await _apiClient.get<List<dynamic>>(
      ApiConstants.householdChildren(householdId),
    );
    return response
        .map((json) => ChildProfile.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Creates a new household.
  Future<Household> createHousehold(CreateHouseholdRequest request) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.households,
      data: request.toJson(),
    );
    return Household.fromJson(response);
  }

  /// Adds a child to the household.
  Future<ChildProfile> addChild(String householdId, AddChildRequest request) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.householdChildren(householdId),
      data: request.toJson(),
    );
    return ChildProfile.fromJson(response);
  }
}
