import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../router/routes.dart';

/// Bottom navigation bar for parent users.
///
/// Provides 5 tabs: Home, Tasks, Family, Rewards, Settings.
class BottomNav extends StatelessWidget {
  const BottomNav({super.key});

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith(Routes.tasksPath)) return 1;
    if (location.startsWith(Routes.familyPath)) return 2;
    if (location.startsWith(Routes.rewardsPath)) return 3;
    if (location.startsWith(Routes.settingsPath)) return 4;
    return 0; // Home
  }

  void _onItemTapped(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go(Routes.homePath);
      case 1:
        context.go(Routes.tasksPath);
      case 2:
        context.go(Routes.familyPath);
      case 3:
        context.go(Routes.rewardsPath);
      case 4:
        context.go(Routes.settingsPath);
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
          label: 'Tasks',
        ),
        NavigationDestination(
          icon: Icon(Icons.family_restroom_outlined),
          selectedIcon: Icon(Icons.family_restroom, color: AppColors.primary),
          label: 'Family',
        ),
        NavigationDestination(
          icon: Icon(Icons.card_giftcard_outlined),
          selectedIcon: Icon(Icons.card_giftcard, color: AppColors.primary),
          label: 'Rewards',
        ),
        NavigationDestination(
          icon: Icon(Icons.settings_outlined),
          selectedIcon: Icon(Icons.settings, color: AppColors.primary),
          label: 'Settings',
        ),
      ],
    );
  }
}
