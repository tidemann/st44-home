import 'package:intl/intl.dart';

/// Date and time utility functions.
abstract final class AppDateUtils {
  /// Formats a date as "Jan 15, 2024".
  static String formatDate(DateTime date) {
    return DateFormat.yMMMd().format(date);
  }

  /// Formats a date as "January 15, 2024".
  static String formatDateLong(DateTime date) {
    return DateFormat.yMMMMd().format(date);
  }

  /// Formats a time as "3:30 PM".
  static String formatTime(DateTime date) {
    return DateFormat.jm().format(date);
  }

  /// Formats a date and time as "Jan 15, 2024 at 3:30 PM".
  static String formatDateTime(DateTime date) {
    return '${formatDate(date)} at ${formatTime(date)}';
  }

  /// Returns a relative time string like "2 hours ago" or "in 3 days".
  static String formatRelative(DateTime date) {
    final now = DateTime.now();
    final difference = date.difference(now);
    final absDiff = difference.abs();

    if (absDiff.inSeconds < 60) {
      return 'just now';
    } else if (absDiff.inMinutes < 60) {
      final minutes = absDiff.inMinutes;
      final unit = minutes == 1 ? 'minute' : 'minutes';
      return difference.isNegative ? '$minutes $unit ago' : 'in $minutes $unit';
    } else if (absDiff.inHours < 24) {
      final hours = absDiff.inHours;
      final unit = hours == 1 ? 'hour' : 'hours';
      return difference.isNegative ? '$hours $unit ago' : 'in $hours $unit';
    } else if (absDiff.inDays < 7) {
      final days = absDiff.inDays;
      final unit = days == 1 ? 'day' : 'days';
      return difference.isNegative ? '$days $unit ago' : 'in $days $unit';
    } else if (absDiff.inDays < 30) {
      final weeks = (absDiff.inDays / 7).floor();
      final unit = weeks == 1 ? 'week' : 'weeks';
      return difference.isNegative ? '$weeks $unit ago' : 'in $weeks $unit';
    } else {
      return formatDate(date);
    }
  }

  /// Checks if the date is today.
  static bool isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  /// Checks if the date is tomorrow.
  static bool isTomorrow(DateTime date) {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    return date.year == tomorrow.year &&
        date.month == tomorrow.month &&
        date.day == tomorrow.day;
  }

  /// Checks if the date is in the past.
  static bool isPast(DateTime date) {
    return date.isBefore(DateTime.now());
  }

  /// Returns start of day for the given date.
  static DateTime startOfDay(DateTime date) {
    return DateTime(date.year, date.month, date.day);
  }

  /// Returns end of day for the given date.
  static DateTime endOfDay(DateTime date) {
    return DateTime(date.year, date.month, date.day, 23, 59, 59, 999);
  }
}
