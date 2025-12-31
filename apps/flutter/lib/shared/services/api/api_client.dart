import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import 'api_exception.dart';
import 'auth_interceptor.dart';

/// Provider for the API client.
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref);
});

/// HTTP client for API requests.
///
/// Uses Dio with authentication interceptor for JWT token handling.
class ApiClient {
  ApiClient(this._ref) {
    _dio = Dio(_baseOptions);
    _dio.interceptors.addAll([
      AuthInterceptor(_ref),
      _loggingInterceptor,
    ]);
  }

  final Ref _ref;
  late final Dio _dio;

  static final _baseOptions = BaseOptions(
    baseUrl: ApiConstants.apiUrl,
    connectTimeout: ApiConstants.connectTimeout,
    receiveTimeout: ApiConstants.requestTimeout,
    sendTimeout: ApiConstants.requestTimeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  );

  static final _loggingInterceptor = LogInterceptor(
    requestBody: true,
    responseBody: true,
    error: true,
  );

  /// Makes a GET request.
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? decoder,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        path,
        queryParameters: queryParameters,
      );
      return _handleResponse(response, decoder);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Makes a POST request.
  Future<T> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? decoder,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return _handleResponse(response, decoder);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Makes a PUT request.
  Future<T> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? decoder,
  }) async {
    try {
      final response = await _dio.put<dynamic>(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return _handleResponse(response, decoder);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Makes a PATCH request.
  Future<T> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? decoder,
  }) async {
    try {
      final response = await _dio.patch<dynamic>(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return _handleResponse(response, decoder);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// Makes a DELETE request.
  Future<T> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? decoder,
  }) async {
    try {
      final response = await _dio.delete<dynamic>(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return _handleResponse(response, decoder);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  T _handleResponse<T>(Response<dynamic> response, T Function(dynamic)? decoder) {
    final data = response.data;
    if (decoder != null) {
      return decoder(data);
    }
    return data as T;
  }
}
