import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_typography.dart';

/// Diddit! app theme configuration.
///
/// Provides light and dark theme data matching the Angular web app design.
abstract final class AppTheme {
  /// Light theme configuration.
  static ThemeData get light => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        colorScheme: _lightColorScheme,
        textTheme: AppTypography.textTheme,
        scaffoldBackgroundColor: AppColors.background,
        cardTheme: _cardTheme,
        appBarTheme: _appBarThemeLight,
        bottomNavigationBarTheme: _bottomNavThemeLight,
        inputDecorationTheme: _inputDecorationTheme,
        elevatedButtonTheme: _elevatedButtonTheme,
        outlinedButtonTheme: _outlinedButtonTheme,
        textButtonTheme: _textButtonTheme,
        floatingActionButtonTheme: _fabTheme,
        chipTheme: _chipTheme,
        dividerTheme: _dividerTheme,
        snackBarTheme: _snackBarTheme,
      );

  /// Dark theme configuration.
  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: _darkColorScheme,
        textTheme: AppTypography.textTheme,
        scaffoldBackgroundColor: AppColors.backgroundDark,
        cardTheme: _cardThemeDark,
        appBarTheme: _appBarThemeDark,
        bottomNavigationBarTheme: _bottomNavThemeDark,
        inputDecorationTheme: _inputDecorationThemeDark,
        elevatedButtonTheme: _elevatedButtonTheme,
        outlinedButtonTheme: _outlinedButtonThemeDark,
        textButtonTheme: _textButtonTheme,
        floatingActionButtonTheme: _fabTheme,
        chipTheme: _chipThemeDark,
        dividerTheme: _dividerThemeDark,
        snackBarTheme: _snackBarThemeDark,
      );

  // Color Schemes
  static const _lightColorScheme = ColorScheme.light(
    primary: AppColors.primary,
    onPrimary: AppColors.textInverse,
    primaryContainer: AppColors.primaryLight,
    secondary: AppColors.accent,
    onSecondary: AppColors.textInverse,
    secondaryContainer: AppColors.accentLight,
    surface: AppColors.surface,
    onSurface: AppColors.textPrimary,
    error: AppColors.error,
    onError: AppColors.textInverse,
  );

  static const _darkColorScheme = ColorScheme.dark(
    primary: AppColors.primary,
    onPrimary: AppColors.textInverse,
    primaryContainer: AppColors.primaryDark,
    secondary: AppColors.accent,
    onSecondary: AppColors.textInverse,
    secondaryContainer: AppColors.accentDark,
    surface: AppColors.surfaceDark,
    onSurface: AppColors.textPrimaryDark,
    error: AppColors.error,
    onError: AppColors.textInverse,
  );

  // Card Theme
  static const _cardTheme = CardTheme(
    color: AppColors.card,
    elevation: 2,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(12)),
    ),
  );

  static const _cardThemeDark = CardTheme(
    color: AppColors.cardDark,
    elevation: 2,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(12)),
    ),
  );

  // AppBar Theme
  static const _appBarThemeLight = AppBarTheme(
    backgroundColor: AppColors.card,
    foregroundColor: AppColors.textPrimary,
    elevation: 0,
    centerTitle: true,
  );

  static const _appBarThemeDark = AppBarTheme(
    backgroundColor: AppColors.cardDark,
    foregroundColor: AppColors.textPrimaryDark,
    elevation: 0,
    centerTitle: true,
  );

  // Bottom Navigation Theme
  static const _bottomNavThemeLight = BottomNavigationBarThemeData(
    backgroundColor: AppColors.card,
    selectedItemColor: AppColors.primary,
    unselectedItemColor: AppColors.textSecondary,
    type: BottomNavigationBarType.fixed,
    elevation: 8,
  );

  static const _bottomNavThemeDark = BottomNavigationBarThemeData(
    backgroundColor: AppColors.cardDark,
    selectedItemColor: AppColors.primary,
    unselectedItemColor: AppColors.textSecondaryDark,
    type: BottomNavigationBarType.fixed,
    elevation: 8,
  );

  // Input Decoration Theme
  static final _inputDecorationTheme = InputDecorationTheme(
    filled: true,
    fillColor: AppColors.surface,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.border),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.border),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.primary, width: 2),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.error),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
  );

  static final _inputDecorationThemeDark = InputDecorationTheme(
    filled: true,
    fillColor: AppColors.surfaceDark,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.borderDark),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.borderDark),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.primary, width: 2),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.error),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
  );

  // Button Themes
  static final _elevatedButtonTheme = ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.primary,
      foregroundColor: AppColors.textInverse,
      elevation: 2,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
    ),
  );

  static final _outlinedButtonTheme = OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: AppColors.primary,
      side: const BorderSide(color: AppColors.primary),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
    ),
  );

  static final _outlinedButtonThemeDark = OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: AppColors.primaryLight,
      side: const BorderSide(color: AppColors.primaryLight),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
    ),
  );

  static final _textButtonTheme = TextButtonThemeData(
    style: TextButton.styleFrom(
      foregroundColor: AppColors.primary,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    ),
  );

  static const _fabTheme = FloatingActionButtonThemeData(
    backgroundColor: AppColors.primary,
    foregroundColor: AppColors.textInverse,
    elevation: 4,
    shape: CircleBorder(),
  );

  // Chip Theme
  static final _chipTheme = ChipThemeData(
    backgroundColor: AppColors.surface,
    selectedColor: AppColors.primaryLight,
    disabledColor: AppColors.border,
    labelStyle: const TextStyle(color: AppColors.textPrimary),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
    ),
  );

  static final _chipThemeDark = ChipThemeData(
    backgroundColor: AppColors.surfaceDark,
    selectedColor: AppColors.primaryDark,
    disabledColor: AppColors.borderDark,
    labelStyle: const TextStyle(color: AppColors.textPrimaryDark),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
    ),
  );

  // Divider Theme
  static const _dividerTheme = DividerThemeData(
    color: AppColors.border,
    thickness: 1,
    space: 1,
  );

  static const _dividerThemeDark = DividerThemeData(
    color: AppColors.borderDark,
    thickness: 1,
    space: 1,
  );

  // SnackBar Theme
  static final _snackBarTheme = SnackBarThemeData(
    backgroundColor: AppColors.textPrimary,
    contentTextStyle: const TextStyle(color: AppColors.textInverse),
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8),
    ),
  );

  static final _snackBarThemeDark = SnackBarThemeData(
    backgroundColor: AppColors.card,
    contentTextStyle: const TextStyle(color: AppColors.textPrimary),
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8),
    ),
  );
}
