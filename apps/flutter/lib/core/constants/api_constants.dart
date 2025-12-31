/// API configuration constants.
abstract final class ApiConstants {
  /// Base URL for the API.
  ///
  /// In production, this should be configured via environment variables.
  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  /// API version prefix.
  static const apiPrefix = '/api';

  /// Full API URL.
  static String get apiUrl => '$baseUrl$apiPrefix';

  /// Request timeout in milliseconds.
  static const requestTimeout = Duration(seconds: 30);

  /// Connection timeout in milliseconds.
  static const connectTimeout = Duration(seconds: 10);

  // Auth endpoints
  static const authLogin = '/auth/login';
  static const authRegister = '/auth/register';
  static const authLogout = '/auth/logout';
  static const authRefresh = '/auth/refresh';
  static const authMe = '/auth/me';

  // User endpoints
  static const users = '/users';
  static String user(String id) => '/users/$id';

  // Household endpoints
  static const households = '/households';
  static String household(String id) => '/households/$id';
  static String householdMembers(String id) => '/households/$id/members';
  static String householdChildren(String id) => '/households/$id/children';

  // Task endpoints
  static const tasks = '/tasks';
  static String task(String id) => '/tasks/$id';
  static String taskComplete(String id) => '/tasks/$id/complete';
  static String taskApprove(String id) => '/tasks/$id/approve';

  // Reward endpoints
  static const rewards = '/rewards';
  static String reward(String id) => '/rewards/$id';
  static String rewardRedeem(String id) => '/rewards/$id/redeem';
}
