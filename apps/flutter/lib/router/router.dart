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
import '../shared/widgets/child_shell_scaffold.dart';
import '../shared/widgets/shell_scaffold.dart';
import 'guards/auth_guard.dart';
import 'guards/role_guard.dart';
import 'routes.dart';

/// The main router provider.
///
/// Uses GoRouter for declarative routing with authentication and role guards.
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: Routes.homePath,
    debugLogDiagnostics: true,
    refreshListenable: _GoRouterRefreshStream(ref),
    redirect: (context, state) {
      // Apply auth guard
      final authRedirect = authGuard(ref, state.matchedLocation);
      if (authRedirect != null) return authRedirect;

      // Apply role guard
      final roleRedirect = roleGuard(ref, state.matchedLocation);
      if (roleRedirect != null) return roleRedirect;

      return null;
    },
    routes: [
      // Auth routes (no shell)
      GoRoute(
        path: Routes.loginPath,
        name: Routes.login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: Routes.registerPath,
        name: Routes.register,
        builder: (context, state) => const RegisterPage(),
      ),

      // Child shell with bottom navigation (3 tabs)
      ShellRoute(
        builder: (context, state, child) => ChildShellScaffold(child: child),
        routes: [
          GoRoute(
            path: Routes.childDashboardPath,
            name: Routes.childDashboard,
            builder: (context, state) => const ChildDashboardPage(),
          ),
          GoRoute(
            path: Routes.childTasksPath,
            name: Routes.childTasks,
            builder: (context, state) => const ChildTasksPage(),
          ),
          GoRoute(
            path: Routes.childRewardsPath,
            name: Routes.childRewards,
            builder: (context, state) => const ChildRewardsPage(),
          ),
        ],
      ),

      // Parent shell with bottom navigation (5 tabs)
      ShellRoute(
        builder: (context, state, child) => ShellScaffold(child: child),
        routes: [
          GoRoute(
            path: Routes.homePath,
            name: Routes.home,
            builder: (context, state) => const HomePage(),
          ),
          GoRoute(
            path: Routes.tasksPath,
            name: Routes.tasks,
            builder: (context, state) => const TasksPage(),
          ),
          GoRoute(
            path: Routes.familyPath,
            name: Routes.family,
            builder: (context, state) => const FamilyPage(),
          ),
          GoRoute(
            path: Routes.rewardsPath,
            name: Routes.rewards,
            builder: (context, state) => const RewardsPage(),
          ),
          GoRoute(
            path: Routes.settingsPath,
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
              onPressed: () => context.go(Routes.homePath),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
});

/// Listenable for GoRouter refresh when auth state changes.
class _GoRouterRefreshStream extends ChangeNotifier {
  _GoRouterRefreshStream(this._ref) {
    _ref.listen(authProvider, (_, __) => notifyListeners());
  }

  final Ref _ref;
}
