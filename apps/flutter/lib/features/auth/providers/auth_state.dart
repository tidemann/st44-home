import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../shared/models/models.dart';

part 'auth_state.freezed.dart';

/// Authentication state.
@freezed
class AuthState with _$AuthState {
  /// Initial loading state.
  const factory AuthState.initial() = AuthStateInitial;

  /// Loading state during auth operations.
  const factory AuthState.loading() = AuthStateLoading;

  /// Authenticated state with user data.
  const factory AuthState.authenticated(User user) = AuthStateAuthenticated;

  /// Unauthenticated state.
  const factory AuthState.unauthenticated() = AuthStateUnauthenticated;

  /// Error state with message.
  const factory AuthState.error(String message) = AuthStateError;
}

/// Extension methods for AuthState.
extension AuthStateExtension on AuthState {
  /// Returns true if the user is authenticated.
  bool get isAuthenticated => this is AuthStateAuthenticated;

  /// Returns true if the state is loading.
  bool get isLoading => this is AuthStateLoading;

  /// Returns the user if authenticated, null otherwise.
  User? get user => maybeMap(
        authenticated: (state) => state.user,
        orElse: () => null,
      );

  /// Returns the error message if in error state, null otherwise.
  String? get errorMessage => maybeMap(
        error: (state) => state.message,
        orElse: () => null,
      );
}
