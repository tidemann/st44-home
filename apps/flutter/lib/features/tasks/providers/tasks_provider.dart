import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/models.dart';
import '../../../shared/services/api/api_exception.dart';
import '../data/task_repository.dart';

/// State for tasks list.
sealed class TasksState {
  const TasksState();
}

class TasksLoading extends TasksState {
  const TasksLoading();
}

class TasksLoaded extends TasksState {
  const TasksLoaded(this.tasks);
  final List<Task> tasks;
}

class TasksError extends TasksState {
  const TasksError(this.message);
  final String message;
}

/// Provider for the tasks list.
final tasksProvider = StateNotifierProvider<TasksNotifier, TasksState>((ref) {
  return TasksNotifier(ref.watch(taskRepositoryProvider));
});

/// Notifier for managing tasks state.
class TasksNotifier extends StateNotifier<TasksState> {
  TasksNotifier(this._repository) : super(const TasksLoading()) {
    loadTasks();
  }

  final TaskRepository _repository;

  /// Loads all tasks.
  Future<void> loadTasks() async {
    state = const TasksLoading();
    try {
      final tasks = await _repository.getTasks();
      state = TasksLoaded(tasks);
    } on ApiException catch (e) {
      state = TasksError(e.message);
    } catch (e) {
      state = TasksError('Failed to load tasks');
    }
  }

  /// Refreshes the tasks list.
  Future<void> refresh() => loadTasks();

  /// Creates a new task.
  Future<bool> createTask(CreateTaskRequest request) async {
    try {
      await _repository.createTask(request);
      await loadTasks();
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Completes a task.
  Future<bool> completeTask(String id) async {
    try {
      await _repository.completeTask(id);
      await loadTasks();
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Approves a task.
  Future<bool> approveTask(String id) async {
    try {
      await _repository.approveTask(id);
      await loadTasks();
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Deletes a task.
  Future<bool> deleteTask(String id) async {
    try {
      await _repository.deleteTask(id);
      await loadTasks();
      return true;
    } catch (e) {
      return false;
    }
  }
}

/// Provider for filtered tasks.
final pendingTasksProvider = Provider<List<Task>>((ref) {
  final state = ref.watch(tasksProvider);
  if (state is TasksLoaded) {
    return state.tasks.where((t) => t.status == 'pending').toList();
  }
  return [];
});

final completedTasksProvider = Provider<List<Task>>((ref) {
  final state = ref.watch(tasksProvider);
  if (state is TasksLoaded) {
    return state.tasks.where((t) => t.status == 'completed').toList();
  }
  return [];
});

final approvedTasksProvider = Provider<List<Task>>((ref) {
  final state = ref.watch(tasksProvider);
  if (state is TasksLoaded) {
    return state.tasks.where((t) => t.status == 'approved').toList();
  }
  return [];
});
