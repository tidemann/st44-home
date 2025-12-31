import 'package:freezed_annotation/freezed_annotation.dart';

part 'task.freezed.dart';
part 'task.g.dart';

/// Task model.
@freezed
class Task with _$Task {
  const factory Task({
    required String id,
    required String title,
    String? description,
    required int points,
    required String status,
    String? assignedTo,
    String? assignedToName,
    required String createdBy,
    String? householdId,
    DateTime? dueDate,
    DateTime? completedAt,
    DateTime? approvedAt,
    String? approvedBy,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _Task;

  factory Task.fromJson(Map<String, dynamic> json) => _$TaskFromJson(json);
}

/// Task status enumeration.
enum TaskStatus {
  pending,
  completed,
  approved,
  rejected,
}

/// Extension for TaskStatus.
extension TaskStatusExtension on TaskStatus {
  String get displayName {
    switch (this) {
      case TaskStatus.pending:
        return 'Pending';
      case TaskStatus.completed:
        return 'Completed';
      case TaskStatus.approved:
        return 'Approved';
      case TaskStatus.rejected:
        return 'Rejected';
    }
  }

  bool get isPending => this == TaskStatus.pending;
  bool get isCompleted => this == TaskStatus.completed;
  bool get isApproved => this == TaskStatus.approved;
  bool get isRejected => this == TaskStatus.rejected;
}

/// Extension to parse task status from string.
extension StringToTaskStatus on String {
  TaskStatus toTaskStatus() {
    switch (toLowerCase()) {
      case 'pending':
        return TaskStatus.pending;
      case 'completed':
        return TaskStatus.completed;
      case 'approved':
        return TaskStatus.approved;
      case 'rejected':
        return TaskStatus.rejected;
      default:
        return TaskStatus.pending;
    }
  }
}

/// Create task request model.
@freezed
class CreateTaskRequest with _$CreateTaskRequest {
  const factory CreateTaskRequest({
    required String title,
    String? description,
    required int points,
    String? assignedTo,
    DateTime? dueDate,
  }) = _CreateTaskRequest;

  factory CreateTaskRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateTaskRequestFromJson(json);
}

/// Update task request model.
@freezed
class UpdateTaskRequest with _$UpdateTaskRequest {
  const factory UpdateTaskRequest({
    String? title,
    String? description,
    int? points,
    String? assignedTo,
    String? status,
    DateTime? dueDate,
  }) = _UpdateTaskRequest;

  factory UpdateTaskRequest.fromJson(Map<String, dynamic> json) =>
      _$UpdateTaskRequestFromJson(json);
}
