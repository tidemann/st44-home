import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

/// User model.
@freezed
class User with _$User {
  const factory User({
    required String id,
    required String email,
    required String firstName,
    required String lastName,
    required String role,
    String? householdId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

/// User role enumeration.
enum UserRole {
  parent,
  child,
  admin,
}

/// Extension to get UserRole from string.
extension UserRoleExtension on String {
  UserRole toUserRole() {
    switch (toLowerCase()) {
      case 'parent':
        return UserRole.parent;
      case 'child':
        return UserRole.child;
      case 'admin':
        return UserRole.admin;
      default:
        return UserRole.child;
    }
  }
}
