import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../auth/providers/providers.dart';
import '../providers/home_provider.dart';
import 'widgets/child_progress_card.dart';
import 'widgets/quick_add_button.dart';
import 'widgets/stat_card.dart';
import 'widgets/task_summary.dart';

/// Home page - Parent dashboard.
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final dashboardState = ref.watch(homeDashboardProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Diddit!'),
        actions: [
          // Household selector (placeholder)
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: Center(
              child: TextButton.icon(
                onPressed: () {
                  // TODO: Show household selector dialog
                },
                icon: const Icon(Icons.home, color: Colors.white),
                label: Text(
                  'My Household',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white,
                      ),
                ),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.read(homeDashboardProvider.notifier).refresh(),
          child: dashboardState.isLoading
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Welcome section
                      _WelcomeCard(userName: user?.firstName ?? 'Parent'),
                      const SizedBox(height: 24),

                      // Quick stats
                      _QuickStatsSection(dashboardState: dashboardState),
                      const SizedBox(height: 24),

                      // Today's tasks
                      _TodaysTasksSection(dashboardState: dashboardState),
                      const SizedBox(height: 24),

                      // Children progress
                      _ChildrenProgressSection(dashboardState: dashboardState),
                    ],
                  ),
                ),
        ),
      ),
      floatingActionButton: QuickAddButton(
        onPressed: () {
          // TODO: Navigate to create task
        },
      ),
    );
  }
}

class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({required this.userName});

  final String userName;

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    String greeting;
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }

    return Card(
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: AppColors.primaryGradient,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$greeting,',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.white.withOpacity(0.9),
                  ),
            ),
            Text(
              userName,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickStatsSection extends StatelessWidget {
  const _QuickStatsSection({required this.dashboardState});

  final HomeDashboardState dashboardState;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Stats',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: StatCard(
                icon: Icons.task_alt,
                label: 'Pending Tasks',
                value: '${dashboardState.pendingTasks}',
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: StatCard(
                icon: Icons.check_circle,
                label: 'Completed Today',
                value: '${dashboardState.completedToday}',
                color: AppColors.success,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: StatCard(
                icon: Icons.pending_actions,
                label: 'Awaiting Approval',
                value: '${dashboardState.awaitingApproval}',
                color: AppColors.warning,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: StatCard(
                icon: Icons.stars,
                label: 'Points Given',
                value: '${dashboardState.pointsGiven}',
                color: AppColors.accent,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _TodaysTasksSection extends StatelessWidget {
  const _TodaysTasksSection({required this.dashboardState});

  final HomeDashboardState dashboardState;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Today's Tasks",
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        TaskSummary(
          tasks: dashboardState.todaysTasks,
          onTaskTap: (task) {
            // TODO: Navigate to task detail
          },
        ),
      ],
    );
  }
}

class _ChildrenProgressSection extends StatelessWidget {
  const _ChildrenProgressSection({required this.dashboardState});

  final HomeDashboardState dashboardState;

  @override
  Widget build(BuildContext context) {
    if (dashboardState.children.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Children Progress',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        ...dashboardState.children.map(
          (child) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: ChildProgressCard(
              childName: child.name,
              completedTasks: child.completedTasks,
              totalTasks: child.totalTasks,
              points: child.points,
              avatarUrl: child.avatarUrl,
            ),
          ),
        ),
      ],
    );
  }
}
