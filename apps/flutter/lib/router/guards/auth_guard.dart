import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/providers/providers.dart';
import '../routes.dart';

/// Checks if user is authenticated and redirects to login if not.
///
/// Returns the redirect path or null if no redirect needed.
String? authGuard(Ref ref, String location) {
  final authState = ref.read(authProvider);
  final isAuthenticated = authState.isAuthenticated;
  final isLoading = authState.isLoading;
  final isAuthRoute =
      location == Routes.loginPath || location == Routes.registerPath;

  // Don't redirect while loading
  if (isLoading) return null;

  // Redirect to login if not authenticated and not on auth route
  if (!isAuthenticated && !isAuthRoute) {
    return Routes.loginPath;
  }

  // Redirect to home if authenticated and on auth route
  if (isAuthenticated && isAuthRoute) {
    return roleBasedRedirect(ref);
  }

  return null;
}

/// Redirects to appropriate dashboard based on user role.
String roleBasedRedirect(Ref ref) {
  final authState = ref.read(authProvider);
  final user = authState.user;

  // Redirect children to child dashboard
  if (user?.role == 'child') {
    return Routes.childDashboardPath;
  }

  // Redirect parents to home
  return Routes.homePath;
}
