import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth.dart';
import '../features/home/presentation/home_page.dart';
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

      // Main app shell with bottom navigation
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
            builder: (context, state) => const Scaffold(
              body: Center(child: Text('Tasks - Coming Soon')),
            ),
          ),
          GoRoute(
            path: '/family',
            name: Routes.family,
            builder: (context, state) => const Scaffold(
              body: Center(child: Text('Family - Coming Soon')),
            ),
          ),
          GoRoute(
            path: '/rewards',
            name: Routes.rewards,
            builder: (context, state) => const Scaffold(
              body: Center(child: Text('Rewards - Coming Soon')),
            ),
          ),
          GoRoute(
            path: '/settings',
            name: Routes.settings,
            builder: (context, state) => const Scaffold(
              body: Center(child: Text('Settings - Coming Soon')),
            ),
          ),
        ],
      ),

      // Child dashboard (separate from parent shell)
      GoRoute(
        path: '/child',
        name: Routes.childDashboard,
        builder: (context, state) => const Scaffold(
          body: Center(child: Text('Child Dashboard - Coming Soon')),
        ),
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
