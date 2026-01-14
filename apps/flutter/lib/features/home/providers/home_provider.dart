import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../presentation/widgets/task_summary.dart';

/// Home dashboard state.
class HomeDashboardState {
  const HomeDashboardState({
    this.pendingTasks = 0,
    this.completedToday = 0,
    this.awaitingApproval = 0,
    this.pointsGiven = 0,
    this.todaysTasks = const [],
    this.children = const [],
    this.selectedHouseholdId,
    this.isLoading = false,
  });

  final int pendingTasks;
  final int completedToday;
  final int awaitingApproval;
  final int pointsGiven;
  final List<TaskItem> todaysTasks;
  final List<ChildProgress> children;
  final String? selectedHouseholdId;
  final bool isLoading;

  HomeDashboardState copyWith({
    int? pendingTasks,
    int? completedToday,
    int? awaitingApproval,
    int? pointsGiven,
    List<TaskItem>? todaysTasks,
    List<ChildProgress>? children,
    String? selectedHouseholdId,
    bool? isLoading,
  }) {
    return HomeDashboardState(
      pendingTasks: pendingTasks ?? this.pendingTasks,
      completedToday: completedToday ?? this.completedToday,
      awaitingApproval: awaitingApproval ?? this.awaitingApproval,
      pointsGiven: pointsGiven ?? this.pointsGiven,
      todaysTasks: todaysTasks ?? this.todaysTasks,
      children: children ?? this.children,
      selectedHouseholdId: selectedHouseholdId ?? this.selectedHouseholdId,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

/// Child progress data.
class ChildProgress {
  const ChildProgress({
    required this.id,
    required this.name,
    this.completedTasks = 0,
    this.totalTasks = 0,
    this.points = 0,
    this.avatarUrl,
  });

  final String id;
  final String name;
  final int completedTasks;
  final int totalTasks;
  final int points;
  final String? avatarUrl;
}

/// Home dashboard provider.
class HomeDashboardNotifier extends StateNotifier<HomeDashboardState> {
  HomeDashboardNotifier() : super(const HomeDashboardState()) {
    // Load initial data
    loadDashboardData();
  }

  /// Load dashboard data from API.
  Future<void> loadDashboardData() async {
    state = state.copyWith(isLoading: true);

    // TODO: Replace with actual API call
    await Future.delayed(const Duration(milliseconds: 500));

    // Mock data for now
    state = state.copyWith(
      pendingTasks: 5,
      completedToday: 3,
      awaitingApproval: 2,
      pointsGiven: 45,
      todaysTasks: [
        const TaskItem(
          id: '1',
          title: 'Clean your room',
          childName: 'Emma',
          points: 10,
          isCompleted: false,
        ),
        const TaskItem(
          id: '2',
          title: 'Do homework',
          childName: 'Liam',
          points: 15,
          isCompleted: true,
        ),
        const TaskItem(
          id: '3',
          title: 'Feed the dog',
          childName: 'Emma',
          points: 5,
          isCompleted: false,
        ),
      ],
      children: [
        const ChildProgress(
          id: '1',
          name: 'Emma',
          completedTasks: 3,
          totalTasks: 5,
          points: 45,
        ),
        const ChildProgress(
          id: '2',
          name: 'Liam',
          completedTasks: 4,
          totalTasks: 6,
          points: 60,
        ),
      ],
      isLoading: false,
    );
  }

  /// Refresh dashboard data.
  Future<void> refresh() async {
    await loadDashboardData();
  }

  /// Select a household.
  void selectHousehold(String householdId) {
    state = state.copyWith(selectedHouseholdId: householdId);
    loadDashboardData();
  }
}

/// Home dashboard provider.
final homeDashboardProvider =
    StateNotifierProvider<HomeDashboardNotifier, HomeDashboardState>(
  (ref) => HomeDashboardNotifier(),
);
