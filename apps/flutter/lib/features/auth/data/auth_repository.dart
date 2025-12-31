import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/api/api_client.dart';
import '../../../shared/services/storage/secure_storage.dart';

/// Provider for the auth repository.
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(secureStorageProvider),
  );
});

/// Repository for authentication operations.
class AuthRepository {
  const AuthRepository(this._apiClient, this._storage);

  final ApiClient _apiClient;
  final SecureStorageService _storage;

  /// Logs in with email and password.
  Future<AuthResponse> login(LoginRequest request) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.authLogin,
      data: request.toJson(),
    );

    final authResponse = AuthResponse.fromJson(response);

    // Store tokens
    await _storage.setAuthData(
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      userId: authResponse.user.id,
    );

    return authResponse;
  }

  /// Registers a new user.
  Future<AuthResponse> register(RegisterRequest request) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.authRegister,
      data: request.toJson(),
    );

    final authResponse = AuthResponse.fromJson(response);

    // Store tokens
    await _storage.setAuthData(
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      userId: authResponse.user.id,
    );

    return authResponse;
  }

  /// Gets the current user profile.
  Future<User> getCurrentUser() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiConstants.authMe,
    );
    return User.fromJson(response);
  }

  /// Logs out the current user.
  Future<void> logout() async {
    try {
      await _apiClient.post(ApiConstants.authLogout);
    } finally {
      // Always clear tokens, even if API call fails
      await _storage.clearAll();
    }
  }

  /// Checks if the user is logged in.
  Future<bool> isLoggedIn() async {
    return _storage.hasToken();
  }

  /// Refreshes the access token.
  Future<RefreshTokenResponse> refreshToken() async {
    final refreshToken = await _storage.getRefreshToken();
    if (refreshToken == null) {
      throw Exception('No refresh token available');
    }

    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.authRefresh,
      data: RefreshTokenRequest(refreshToken: refreshToken).toJson(),
    );

    final tokenResponse = RefreshTokenResponse.fromJson(response);

    // Update stored tokens
    await _storage.setAccessToken(tokenResponse.accessToken);
    if (tokenResponse.refreshToken != null) {
      await _storage.setRefreshToken(tokenResponse.refreshToken!);
    }

    return tokenResponse;
  }
}
