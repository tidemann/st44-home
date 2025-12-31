import '../constants/app_constants.dart';

/// Form validation utilities.
abstract final class Validators {
  /// Email validation regex.
  static final _emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
  );

  /// Validates an email address.
  static String? email(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }
    if (!_emailRegex.hasMatch(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  /// Validates a password.
  static String? password(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    if (value.length < AppConstants.minPasswordLength) {
      return 'Password must be at least ${AppConstants.minPasswordLength} characters';
    }
    return null;
  }

  /// Validates password confirmation matches.
  static String? Function(String?) confirmPassword(String password) {
    return (String? value) {
      if (value == null || value.isEmpty) {
        return 'Please confirm your password';
      }
      if (value != password) {
        return 'Passwords do not match';
      }
      return null;
    };
  }

  /// Validates a required field is not empty.
  static String? required(String? value, [String fieldName = 'This field']) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName is required';
    }
    return null;
  }

  /// Validates a field has minimum length.
  static String? Function(String?) minLength(int min, [String fieldName = 'This field']) {
    return (String? value) {
      if (value != null && value.length < min) {
        return '$fieldName must be at least $min characters';
      }
      return null;
    };
  }

  /// Validates a field has maximum length.
  static String? Function(String?) maxLength(int max, [String fieldName = 'This field']) {
    return (String? value) {
      if (value != null && value.length > max) {
        return '$fieldName must be at most $max characters';
      }
      return null;
    };
  }

  /// Validates a name field.
  static String? name(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Name is required';
    }
    if (value.length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (value.length > 50) {
      return 'Name must be at most 50 characters';
    }
    return null;
  }

  /// Validates a task title.
  static String? taskTitle(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Task title is required';
    }
    if (value.length > AppConstants.maxTaskTitleLength) {
      return 'Task title must be at most ${AppConstants.maxTaskTitleLength} characters';
    }
    return null;
  }

  /// Validates points value.
  static String? points(String? value) {
    if (value == null || value.isEmpty) {
      return 'Points value is required';
    }
    final points = int.tryParse(value);
    if (points == null) {
      return 'Please enter a valid number';
    }
    if (points < 1) {
      return 'Points must be at least 1';
    }
    if (points > 1000) {
      return 'Points must be at most 1000';
    }
    return null;
  }
}
