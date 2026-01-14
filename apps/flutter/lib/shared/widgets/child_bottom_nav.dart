import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../router/routes.dart';

/// Bottom navigation bar for child users.
///
/// Provides 3 tabs: Dashboard, Tasks, Rewards.
class ChildBottomNav extends StatelessWidget {
  const ChildBottomNav({super.key});

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith(Routes.childTasksPath)) return 1;
    if (location.startsWith(Routes.childRewardsPath)) return 2;
    return 0; // Dashboard
  }

  void _onItemTapped(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go(Routes.childDashboardPath);
      case 1:
        context.go(Routes.childTasksPath);
      case 2:
        context.go(Routes.childRewardsPath);
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _calculateSelectedIndex(context);

    return NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: (index) => _onItemTapped(context, index),
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home, color: AppColors.primary),
          label: 'Home',
        ),
        NavigationDestination(
          icon: Icon(Icons.task_alt_outlined),
          selectedIcon: Icon(Icons.task_alt, color: AppColors.primary),
          label: 'My Tasks',
        ),
        NavigationDestination(
          icon: Icon(Icons.card_giftcard_outlined),
          selectedIcon: Icon(Icons.card_giftcard, color: AppColors.accent),
          label: 'Rewards',
        ),
      ],
    );
  }
}
