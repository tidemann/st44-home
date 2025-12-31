/// Application-wide constants.
abstract final class AppConstants {
  /// App name.
  static const appName = 'Diddit!';

  /// App version (should match pubspec.yaml).
  static const appVersion = '1.0.0';

  /// Minimum password length.
  static const minPasswordLength = 8;

  /// Maximum task title length.
  static const maxTaskTitleLength = 100;

  /// Maximum task description length.
  static const maxTaskDescriptionLength = 500;

  /// Animation durations.
  static const animationFast = Duration(milliseconds: 150);
  static const animationNormal = Duration(milliseconds: 300);
  static const animationSlow = Duration(milliseconds: 500);

  /// Pagination defaults.
  static const defaultPageSize = 20;
  static const maxPageSize = 100;

  /// Cache durations.
  static const cacheDurationShort = Duration(minutes: 5);
  static const cacheDurationMedium = Duration(minutes: 30);
  static const cacheDurationLong = Duration(hours: 2);

  /// Secure storage keys.
  static const accessTokenKey = 'access_token';
  static const refreshTokenKey = 'refresh_token';
  static const userIdKey = 'user_id';

  /// Shared preferences keys.
  static const themeKey = 'theme_mode';
  static const onboardingCompleteKey = 'onboarding_complete';
  static const lastSyncKey = 'last_sync';
}
