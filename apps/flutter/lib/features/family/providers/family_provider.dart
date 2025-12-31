import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/models.dart';
import '../../../shared/services/api/api_exception.dart';
import '../../auth/providers/providers.dart';
import '../data/family_repository.dart';

/// State for family data.
sealed class FamilyState {
  const FamilyState();
}

class FamilyLoading extends FamilyState {
  const FamilyLoading();
}

class FamilyLoaded extends FamilyState {
  const FamilyLoaded({
    required this.members,
    required this.children,
  });

  final List<HouseholdMember> members;
  final List<ChildProfile> children;
}

class FamilyError extends FamilyState {
  const FamilyError(this.message);
  final String message;
}

class FamilyNoHousehold extends FamilyState {
  const FamilyNoHousehold();
}

/// Provider for family data.
final familyProvider = StateNotifierProvider<FamilyNotifier, FamilyState>((ref) {
  final authState = ref.watch(authProvider);
  final repository = ref.watch(familyRepositoryProvider);

  return FamilyNotifier(
    repository: repository,
    householdId: authState.user?.householdId,
  );
});

/// Notifier for managing family state.
class FamilyNotifier extends StateNotifier<FamilyState> {
  FamilyNotifier({
    required FamilyRepository repository,
    required String? householdId,
  })  : _repository = repository,
        _householdId = householdId,
        super(const FamilyLoading()) {
    if (householdId != null) {
      loadFamily();
    } else {
      state = const FamilyNoHousehold();
    }
  }

  final FamilyRepository _repository;
  final String? _householdId;

  /// Loads family data.
  Future<void> loadFamily() async {
    if (_householdId == null) {
      state = const FamilyNoHousehold();
      return;
    }

    state = const FamilyLoading();

    try {
      final results = await Future.wait([
        _repository.getHouseholdMembers(_householdId!),
        _repository.getHouseholdChildren(_householdId!),
      ]);

      state = FamilyLoaded(
        members: results[0] as List<HouseholdMember>,
        children: results[1] as List<ChildProfile>,
      );
    } on ApiException catch (e) {
      state = FamilyError(e.message);
    } catch (e) {
      state = FamilyError('Failed to load family data');
    }
  }

  /// Refreshes family data.
  Future<void> refresh() => loadFamily();

  /// Adds a child to the household.
  Future<bool> addChild(String name) async {
    if (_householdId == null) return false;

    try {
      await _repository.addChild(
        _householdId!,
        AddChildRequest(name: name),
      );
      await loadFamily();
      return true;
    } catch (e) {
      return false;
    }
  }
}
