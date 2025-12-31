import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/constants/app_constants.dart';

/// Provider for secure storage service.
final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

/// Service for secure storage of sensitive data like tokens.
///
/// Uses flutter_secure_storage for encrypted storage.
class SecureStorageService {
  SecureStorageService() : _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  final FlutterSecureStorage _storage;

  /// Base URL for API (used by auth interceptor).
  String get baseUrl => ApiConstants.baseUrl;

  /// Gets the access token.
  Future<String?> getAccessToken() async {
    return _storage.read(key: AppConstants.accessTokenKey);
  }

  /// Sets the access token.
  Future<void> setAccessToken(String token) async {
    await _storage.write(key: AppConstants.accessTokenKey, value: token);
  }

  /// Gets the refresh token.
  Future<String?> getRefreshToken() async {
    return _storage.read(key: AppConstants.refreshTokenKey);
  }

  /// Sets the refresh token.
  Future<void> setRefreshToken(String token) async {
    await _storage.write(key: AppConstants.refreshTokenKey, value: token);
  }

  /// Gets the stored user ID.
  Future<String?> getUserId() async {
    return _storage.read(key: AppConstants.userIdKey);
  }

  /// Sets the user ID.
  Future<void> setUserId(String userId) async {
    await _storage.write(key: AppConstants.userIdKey, value: userId);
  }

  /// Stores authentication data (tokens and user ID).
  Future<void> setAuthData({
    required String accessToken,
    required String refreshToken,
    required String userId,
  }) async {
    await Future.wait([
      setAccessToken(accessToken),
      setRefreshToken(refreshToken),
      setUserId(userId),
    ]);
  }

  /// Deletes a specific key.
  Future<void> delete(String key) async {
    await _storage.delete(key: key);
  }

  /// Clears all secure storage data.
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  /// Checks if a token exists (user may be logged in).
  Future<bool> hasToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
