/// Route names and paths for type-safe navigation.
///
/// Centralizes all route definitions for the app.
abstract final class Routes {
  // Auth routes
  static const login = 'login';
  static const loginPath = '/login';
  static const register = 'register';
  static const registerPath = '/register';

  // Parent routes
  static const home = 'home';
  static const homePath = '/';
  static const tasks = 'tasks';
  static const tasksPath = '/tasks';
  static const family = 'family';
  static const familyPath = '/family';
  static const rewards = 'rewards';
  static const rewardsPath = '/rewards';
  static const settings = 'settings';
  static const settingsPath = '/settings';

  // Child routes
  static const childDashboard = 'child-dashboard';
  static const childDashboardPath = '/child';
  static const childTasks = 'child-tasks';
  static const childTasksPath = '/child/tasks';
  static const childRewards = 'child-rewards';
  static const childRewardsPath = '/child/rewards';
}
