import 'package:flutter/material.dart';

/// Extension methods for String.
extension StringExtension on String {
  /// Capitalizes the first letter of the string.
  String capitalize() {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }

  /// Converts snake_case or kebab-case to Title Case.
  String toTitleCase() {
    return split(RegExp(r'[_-]'))
        .map((word) => word.capitalize())
        .join(' ');
  }

  /// Truncates the string to max length with ellipsis.
  String truncate(int maxLength) {
    if (length <= maxLength) return this;
    return '${substring(0, maxLength - 3)}...';
  }
}

/// Extension methods for DateTime.
extension DateTimeExtension on DateTime {
  /// Returns true if this date is the same day as other.
  bool isSameDay(DateTime other) {
    return year == other.year && month == other.month && day == other.day;
  }

  /// Returns the date with time set to midnight.
  DateTime get dateOnly => DateTime(year, month, day);

  /// Returns true if this date is today.
  bool get isToday => isSameDay(DateTime.now());

  /// Returns true if this date is yesterday.
  bool get isYesterday =>
      isSameDay(DateTime.now().subtract(const Duration(days: 1)));

  /// Returns true if this date is tomorrow.
  bool get isTomorrow =>
      isSameDay(DateTime.now().add(const Duration(days: 1)));
}

/// Extension methods for BuildContext.
extension BuildContextExtension on BuildContext {
  /// Returns the current theme.
  ThemeData get theme => Theme.of(this);

  /// Returns the current text theme.
  TextTheme get textTheme => theme.textTheme;

  /// Returns the current color scheme.
  ColorScheme get colorScheme => theme.colorScheme;

  /// Returns the screen size.
  Size get screenSize => MediaQuery.sizeOf(this);

  /// Returns the screen width.
  double get screenWidth => screenSize.width;

  /// Returns the screen height.
  double get screenHeight => screenSize.height;

  /// Returns true if the screen is considered small (phone).
  bool get isSmallScreen => screenWidth < 600;

  /// Returns true if the screen is considered medium (tablet).
  bool get isMediumScreen => screenWidth >= 600 && screenWidth < 1200;

  /// Returns true if the screen is considered large (desktop).
  bool get isLargeScreen => screenWidth >= 1200;

  /// Shows a snackbar with the given message.
  void showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(this).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? colorScheme.error : null,
      ),
    );
  }

  /// Shows a success snackbar.
  void showSuccess(String message) {
    showSnackBar(message);
  }

  /// Shows an error snackbar.
  void showError(String message) {
    showSnackBar(message, isError: true);
  }
}

/// Extension methods for num.
extension NumExtension on num {
  /// Returns the value clamped between min and max.
  num clampRange(num min, num max) => this < min ? min : (this > max ? max : this);
}

/// Extension methods for List.
extension ListExtension<T> on List<T> {
  /// Returns the first element or null if empty.
  T? get firstOrNull => isEmpty ? null : first;

  /// Returns the last element or null if empty.
  T? get lastOrNull => isEmpty ? null : last;

  /// Returns element at index or null if out of bounds.
  T? elementAtOrNull(int index) {
    if (index < 0 || index >= length) return null;
    return this[index];
  }
}
