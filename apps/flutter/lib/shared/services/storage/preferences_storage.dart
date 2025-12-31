import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants/app_constants.dart';

/// Provider for SharedPreferences instance.
///
/// Must be overridden in ProviderScope with actual instance.
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be initialized');
});

/// Provider for preferences storage service.
final preferencesStorageProvider = Provider<PreferencesStorageService>((ref) {
  return PreferencesStorageService(ref.watch(sharedPreferencesProvider));
});

/// Service for non-sensitive preferences storage.
///
/// Uses SharedPreferences for app settings and state.
class PreferencesStorageService {
  const PreferencesStorageService(this._prefs);

  final SharedPreferences _prefs;

  /// Gets the current theme mode.
  ThemeMode getThemeMode() {
    final value = _prefs.getString(AppConstants.themeKey);
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  /// Sets the theme mode.
  Future<void> setThemeMode(ThemeMode mode) async {
    String value;
    switch (mode) {
      case ThemeMode.light:
        value = 'light';
      case ThemeMode.dark:
        value = 'dark';
      case ThemeMode.system:
        value = 'system';
    }
    await _prefs.setString(AppConstants.themeKey, value);
  }

  /// Checks if onboarding is complete.
  bool isOnboardingComplete() {
    return _prefs.getBool(AppConstants.onboardingCompleteKey) ?? false;
  }

  /// Marks onboarding as complete.
  Future<void> setOnboardingComplete() async {
    await _prefs.setBool(AppConstants.onboardingCompleteKey, true);
  }

  /// Gets the last sync timestamp.
  DateTime? getLastSync() {
    final millis = _prefs.getInt(AppConstants.lastSyncKey);
    if (millis == null) return null;
    return DateTime.fromMillisecondsSinceEpoch(millis);
  }

  /// Sets the last sync timestamp.
  Future<void> setLastSync(DateTime time) async {
    await _prefs.setInt(AppConstants.lastSyncKey, time.millisecondsSinceEpoch);
  }

  /// Gets a string value.
  String? getString(String key) {
    return _prefs.getString(key);
  }

  /// Sets a string value.
  Future<void> setString(String key, String value) async {
    await _prefs.setString(key, value);
  }

  /// Gets an int value.
  int? getInt(String key) {
    return _prefs.getInt(key);
  }

  /// Sets an int value.
  Future<void> setInt(String key, int value) async {
    await _prefs.setInt(key, value);
  }

  /// Gets a bool value.
  bool? getBool(String key) {
    return _prefs.getBool(key);
  }

  /// Sets a bool value.
  Future<void> setBool(String key, bool value) async {
    await _prefs.setBool(key, value);
  }

  /// Removes a key.
  Future<void> remove(String key) async {
    await _prefs.remove(key);
  }

  /// Clears all preferences.
  Future<void> clear() async {
    await _prefs.clear();
  }
}
