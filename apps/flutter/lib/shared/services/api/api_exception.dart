import 'package:dio/dio.dart';

/// Custom exception for API errors.
class ApiException implements Exception {
  const ApiException({
    required this.message,
    this.statusCode,
    this.details,
  });

  /// Creates an ApiException from a DioException.
  factory ApiException.fromDioException(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiException(
          message: 'Connection timed out. Please check your internet connection.',
        );

      case DioExceptionType.connectionError:
        return const ApiException(
          message: 'Unable to connect to the server. Please check your internet connection.',
        );

      case DioExceptionType.badCertificate:
        return const ApiException(
          message: 'Security certificate error. Please try again later.',
        );

      case DioExceptionType.badResponse:
        return _fromResponse(e.response);

      case DioExceptionType.cancel:
        return const ApiException(
          message: 'Request was cancelled.',
        );

      case DioExceptionType.unknown:
        return ApiException(
          message: e.message ?? 'An unexpected error occurred.',
        );
    }
  }

  /// Creates an ApiException from a response.
  static ApiException _fromResponse(Response<dynamic>? response) {
    if (response == null) {
      return const ApiException(
        message: 'No response from server.',
      );
    }

    final statusCode = response.statusCode;
    final data = response.data;

    // Try to extract error message from response body
    String message;
    String? details;

    if (data is Map<String, dynamic>) {
      message = data['message'] as String? ??
          data['error'] as String? ??
          _defaultMessageForStatus(statusCode);
      details = data['details'] as String?;
    } else {
      message = _defaultMessageForStatus(statusCode);
    }

    return ApiException(
      message: message,
      statusCode: statusCode,
      details: details,
    );
  }

  static String _defaultMessageForStatus(int? statusCode) {
    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Please log in to continue.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Server is temporarily unavailable. Please try again later.';
      case 503:
        return 'Service is currently unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred.';
    }
  }

  /// Error message.
  final String message;

  /// HTTP status code (if applicable).
  final int? statusCode;

  /// Additional error details.
  final String? details;

  /// Returns true if this is an authentication error.
  bool get isAuthError => statusCode == 401;

  /// Returns true if this is a permission error.
  bool get isForbidden => statusCode == 403;

  /// Returns true if this is a not found error.
  bool get isNotFound => statusCode == 404;

  /// Returns true if this is a validation error.
  bool get isValidationError => statusCode == 400 || statusCode == 422;

  /// Returns true if this is a server error.
  bool get isServerError => statusCode != null && statusCode! >= 500;

  @override
  String toString() => 'ApiException: $message (status: $statusCode)';
}
