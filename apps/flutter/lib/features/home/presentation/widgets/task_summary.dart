import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

/// Summary widget showing today's tasks.
class TaskSummary extends StatelessWidget {
  const TaskSummary({
    this.tasks = const [],
    this.onTaskTap,
    super.key,
  });

  final List<TaskItem> tasks;
  final void Function(TaskItem)? onTaskTap;

  @override
  Widget build(BuildContext context) {
    if (tasks.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Center(
            child: Column(
              children: [
                Icon(
                  Icons.check_circle_outline,
                  size: 48,
                  color: AppColors.textTertiary,
                ),
                const SizedBox(height: 12),
                Text(
                  'All caught up!',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'No tasks due today',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textTertiary,
                      ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Column(
      children: tasks.map((task) => _TaskListItem(
        task: task,
        onTap: onTaskTap != null ? () => onTaskTap!(task) : null,
      )).toList(),
    );
  }
}

class _TaskListItem extends StatelessWidget {
  const _TaskListItem({
    required this.task,
    this.onTap,
  });

  final TaskItem task;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: task.isCompleted
              ? AppColors.success.withOpacity(0.1)
              : AppColors.primary.withOpacity(0.1),
          child: Icon(
            task.isCompleted ? Icons.check_circle : Icons.circle_outlined,
            color: task.isCompleted ? AppColors.success : AppColors.primary,
          ),
        ),
        title: Text(
          task.title,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                decoration: task.isCompleted ? TextDecoration.lineThrough : null,
              ),
        ),
        subtitle: task.childName != null
            ? Text(
                'Assigned to ${task.childName}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
              )
            : null,
        trailing: task.points != null
            ? Chip(
                label: Text(
                  '${task.points} pts',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                backgroundColor: AppColors.accent.withOpacity(0.1),
                side: BorderSide.none,
              )
            : null,
      ),
    );
  }
}

/// Task item model for display.
class TaskItem {
  const TaskItem({
    required this.id,
    required this.title,
    this.childName,
    this.points,
    this.isCompleted = false,
  });

  final String id;
  final String title;
  final String? childName;
  final int? points;
  final bool isCompleted;
}
