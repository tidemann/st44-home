import 'package:flutter/material.dart';

/// Diddit! app color palette.
///
/// Matches the Angular web app design system.
abstract final class AppColors {
  // Primary colors
  static const primary = Color(0xFF6366F1);
  static const primaryLight = Color(0xFF818CF8);
  static const primaryDark = Color(0xFF4F46E5);

  // Accent colors
  static const accent = Color(0xFFF59E0B);
  static const accentLight = Color(0xFFFBBF24);
  static const accentDark = Color(0xFFD97706);

  // Semantic colors
  static const success = Color(0xFF10B981);
  static const successLight = Color(0xFF34D399);
  static const successDark = Color(0xFF059669);

  static const error = Color(0xFFEF4444);
  static const errorLight = Color(0xFFF87171);
  static const errorDark = Color(0xFFDC2626);

  static const warning = Color(0xFFF59E0B);
  static const warningLight = Color(0xFFFBBF24);
  static const warningDark = Color(0xFFD97706);

  static const info = Color(0xFF3B82F6);
  static const infoLight = Color(0xFF60A5FA);
  static const infoDark = Color(0xFF2563EB);

  // Neutral colors - Light mode
  static const surface = Color(0xFFFAFAFA);
  static const background = Color(0xFFF5F5F5);
  static const card = Color(0xFFFFFFFF);
  static const border = Color(0xFFE5E5E5);

  // Neutral colors - Dark mode
  static const surfaceDark = Color(0xFF1F2937);
  static const backgroundDark = Color(0xFF111827);
  static const cardDark = Color(0xFF374151);
  static const borderDark = Color(0xFF4B5563);

  // Text colors - Light mode
  static const textPrimary = Color(0xFF1F2937);
  static const textSecondary = Color(0xFF6B7280);
  static const textTertiary = Color(0xFF9CA3AF);
  static const textInverse = Color(0xFFFFFFFF);

  // Text colors - Dark mode
  static const textPrimaryDark = Color(0xFFF9FAFB);
  static const textSecondaryDark = Color(0xFFD1D5DB);
  static const textTertiaryDark = Color(0xFF9CA3AF);

  // Gradients
  static const primaryGradient = LinearGradient(
    colors: [primary, primaryLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const accentGradient = LinearGradient(
    colors: [accent, accentLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
