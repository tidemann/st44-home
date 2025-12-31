import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth.dart';
import '../features/child/child.dart';
import '../features/family/family.dart';
import '../features/home/home.dart';
import '../features/rewards/rewards.dart';
import '../features/settings/settings.dart';
import '../features/tasks/tasks.dart';
import '../shared/widgets/shell_scaffold.dart';

/// Route names for type-safe navigation.
abstract final class Routes {
  static const login = 'login';
  static const register = 'register';
  static const home = 'home';
  static const tasks = 'tasks';
  static const family = 'family';
  static const rewards = 'rewards';
  static const settings = 'settings';
  static const childDashboard = 'child-dashboard';
}

/// The main router provider.
///
/// Uses GoRouter for declarative routing with authentication guards.
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    debugLogDiagnostics: true,
    refreshListenable: GoRouterRefreshStream(ref),
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isLoading = authState.isLoading;
      final isAuthRoute = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';

      // Don't redirect while loading
      if (isLoading) return null;

      // Redirect to login if not authenticated and not on auth route
      if (!isAuthenticated && !isAuthRoute) {
        return '/login';
      }

      // Redirect to home if authenticated and on auth route
      if (isAuthenticated && isAuthRoute) {
        // Check if user is a child - redirect to child dashboard
        final user = authState.user;
        if (user?.role == 'child') {
          return '/child';
        }
        return '/';
      }

      return null;
    },
    routes: [
      // Auth routes (no shell)
      GoRoute(
        path: '/login',
        name: Routes.login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/register',
        name: Routes.register,
        builder: (context, state) => const RegisterPage(),
      ),

      // Child dashboard (separate from parent shell)
      GoRoute(
        path: '/child',
        name: Routes.childDashboard,
        builder: (context, state) => const ChildDashboardPage(),
      ),

      // Main app shell with bottom navigation (parent view)
      ShellRoute(
        builder: (context, state, child) => ShellScaffold(child: child),
        routes: [
          GoRoute(
            path: '/',
            name: Routes.home,
            builder: (context, state) => const HomePage(),
          ),
          GoRoute(
            path: '/tasks',
            name: Routes.tasks,
            builder: (context, state) => const TasksPage(),
          ),
          GoRoute(
            path: '/family',
            name: Routes.family,
            builder: (context, state) => const FamilyPage(),
          ),
          GoRoute(
            path: '/rewards',
            name: Routes.rewards,
            builder: (context, state) => const RewardsPage(),
          ),
          GoRoute(
            path: '/settings',
            name: Routes.settings,
            builder: (context, state) => const SettingsPage(),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              'Page not found',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Text(
              state.uri.toString(),
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go('/'),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
});

/// Listenable for GoRouter refresh when auth state changes.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(this._ref) {
    _ref.listen(authProvider, (_, __) => notifyListeners());
  }

  final Ref _ref;
}
