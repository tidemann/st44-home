import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/providers/providers.dart';
import '../routes.dart';

/// Checks if user has required role for the route.
///
/// Returns redirect path or null if access granted.
String? roleGuard(Ref ref, String location) {
  final authState = ref.read(authProvider);
  final user = authState.user;

  // Child routes - only children can access
  final childRoutes = [
    Routes.childDashboardPath,
    Routes.childTasksPath,
    Routes.childRewardsPath,
  ];

  if (childRoutes.any((route) => location.startsWith(route))) {
    if (user?.role != 'child') {
      return Routes.homePath;
    }
  }

  // Parent routes - children cannot access
  final parentRoutes = [
    Routes.tasksPath,
    Routes.familyPath,
    Routes.rewardsPath,
    Routes.settingsPath,
  ];

  if (parentRoutes.any((route) => location.startsWith(route))) {
    if (user?.role == 'child') {
      return Routes.childDashboardPath;
    }
  }

  return null;
}
