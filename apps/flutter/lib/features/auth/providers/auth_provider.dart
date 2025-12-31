import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/models.dart';
import '../../../shared/services/api/api_exception.dart';
import '../data/auth_repository.dart';
import 'auth_state.dart';

/// Provider for the authentication state.
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});

/// Notifier for managing authentication state.
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repository) : super(const AuthState.initial());

  final AuthRepository _repository;

  /// Checks the initial authentication status.
  Future<void> checkAuthStatus() async {
    state = const AuthState.loading();

    try {
      final isLoggedIn = await _repository.isLoggedIn();
      if (isLoggedIn) {
        final user = await _repository.getCurrentUser();
        state = AuthState.authenticated(user);
      } else {
        state = const AuthState.unauthenticated();
      }
    } on ApiException catch (e) {
      if (e.isAuthError) {
        state = const AuthState.unauthenticated();
      } else {
        state = AuthState.error(e.message);
      }
    } catch (e) {
      state = const AuthState.unauthenticated();
    }
  }

  /// Logs in with email and password.
  Future<bool> login(String email, String password) async {
    state = const AuthState.loading();

    try {
      final response = await _repository.login(
        LoginRequest(email: email, password: password),
      );
      state = AuthState.authenticated(response.user);
      return true;
    } on ApiException catch (e) {
      state = AuthState.error(e.message);
      return false;
    } catch (e) {
      state = AuthState.error('An unexpected error occurred. Please try again.');
      return false;
    }
  }

  /// Registers a new user.
  Future<bool> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    state = const AuthState.loading();

    try {
      final response = await _repository.register(
        RegisterRequest(
          email: email,
          password: password,
          firstName: firstName,
          lastName: lastName,
        ),
      );
      state = AuthState.authenticated(response.user);
      return true;
    } on ApiException catch (e) {
      state = AuthState.error(e.message);
      return false;
    } catch (e) {
      state = AuthState.error('An unexpected error occurred. Please try again.');
      return false;
    }
  }

  /// Logs out the current user.
  Future<void> logout() async {
    state = const AuthState.loading();

    try {
      await _repository.logout();
    } finally {
      state = const AuthState.unauthenticated();
    }
  }

  /// Refreshes the current user data.
  Future<void> refreshUser() async {
    if (!state.isAuthenticated) return;

    try {
      final user = await _repository.getCurrentUser();
      state = AuthState.authenticated(user);
    } on ApiException catch (e) {
      if (e.isAuthError) {
        state = const AuthState.unauthenticated();
      }
    }
  }

  /// Clears any error state.
  void clearError() {
    if (state is AuthStateError) {
      state = const AuthState.unauthenticated();
    }
  }
}
