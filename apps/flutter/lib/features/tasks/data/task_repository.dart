import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/api_constants.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/api/api_client.dart';

/// Provider for the task repository.
final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  return TaskRepository(ref.watch(apiClientProvider));
});

/// Repository for task operations.
class TaskRepository {
  const TaskRepository(this._apiClient);

  final ApiClient _apiClient;

  /// Fetches all tasks for the current household.
  Future<List<Task>> getTasks() async {
    final response = await _apiClient.get<List<dynamic>>(
      ApiConstants.tasks,
    );
    return response.map((json) => Task.fromJson(json as Map<String, dynamic>)).toList();
  }

  /// Fetches a single task by ID.
  Future<Task> getTask(String id) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiConstants.task(id),
    );
    return Task.fromJson(response);
  }

  /// Creates a new task.
  Future<Task> createTask(CreateTaskRequest request) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.tasks,
      data: request.toJson(),
    );
    return Task.fromJson(response);
  }

  /// Updates an existing task.
  Future<Task> updateTask(String id, UpdateTaskRequest request) async {
    final response = await _apiClient.patch<Map<String, dynamic>>(
      ApiConstants.task(id),
      data: request.toJson(),
    );
    return Task.fromJson(response);
  }

  /// Deletes a task.
  Future<void> deleteTask(String id) async {
    await _apiClient.delete(ApiConstants.task(id));
  }

  /// Marks a task as complete.
  Future<Task> completeTask(String id) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.taskComplete(id),
    );
    return Task.fromJson(response);
  }

  /// Approves a completed task.
  Future<Task> approveTask(String id) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.taskApprove(id),
    );
    return Task.fromJson(response);
  }
}
