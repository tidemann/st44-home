import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/secure_storage.dart';

/// Interceptor for adding JWT tokens to requests.
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._ref);

  final Ref _ref;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip auth header for login/register endpoints
    if (_isPublicEndpoint(options.path)) {
      return handler.next(options);
    }

    final storage = _ref.read(secureStorageProvider);
    final token = await storage.getAccessToken();

    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Handle 401 errors by attempting token refresh
    if (err.response?.statusCode == 401 && !_isAuthEndpoint(err.requestOptions.path)) {
      final refreshed = await _attemptTokenRefresh();
      if (refreshed) {
        // Retry the original request with new token
        try {
          final storage = _ref.read(secureStorageProvider);
          final newToken = await storage.getAccessToken();

          final options = err.requestOptions;
          options.headers['Authorization'] = 'Bearer $newToken';

          final dio = Dio();
          final response = await dio.fetch(options);
          return handler.resolve(response);
        } catch (e) {
          // Token refresh succeeded but retry failed
          return handler.next(err);
        }
      } else {
        // Token refresh failed, clear tokens and redirect to login
        await _clearTokens();
      }
    }

    handler.next(err);
  }

  bool _isPublicEndpoint(String path) {
    const publicPaths = [
      '/auth/login',
      '/auth/register',
      '/health',
    ];
    return publicPaths.any((p) => path.endsWith(p));
  }

  bool _isAuthEndpoint(String path) {
    return path.contains('/auth/');
  }

  Future<bool> _attemptTokenRefresh() async {
    try {
      final storage = _ref.read(secureStorageProvider);
      final refreshToken = await storage.getRefreshToken();

      if (refreshToken == null) {
        return false;
      }

      final dio = Dio();
      final response = await dio.post<Map<String, dynamic>>(
        '${_ref.read(secureStorageProvider).baseUrl}/api/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data!;
        final newAccessToken = data['accessToken'] as String?;
        final newRefreshToken = data['refreshToken'] as String?;

        if (newAccessToken != null) {
          await storage.setAccessToken(newAccessToken);
          if (newRefreshToken != null) {
            await storage.setRefreshToken(newRefreshToken);
          }
          return true;
        }
      }
    } catch (e) {
      // Token refresh failed
    }
    return false;
  }

  Future<void> _clearTokens() async {
    final storage = _ref.read(secureStorageProvider);
    await storage.clearAll();
  }
}
