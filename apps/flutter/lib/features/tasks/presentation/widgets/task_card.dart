import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/models/models.dart';
import '../../providers/providers.dart';

/// Card widget for displaying a task.
class TaskCard extends ConsumerWidget {
  const TaskCard({required this.task, super.key});

  final Task task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusColor = _getStatusColor(task.status);
    final isCompleted = task.status == 'completed';
    final isApproved = task.status == 'approved';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showTaskDetails(context, ref),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Status indicator
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _getStatusIcon(task.status),
                  color: statusColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),

              // Task info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            decoration: isApproved
                                ? TextDecoration.lineThrough
                                : null,
                          ),
                    ),
                    if (task.description != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        task.description!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (task.assignedToName != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.person_outline,
                            size: 14,
                            color: AppColors.textTertiary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            task.assignedToName!,
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: AppColors.textTertiary,
                                    ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              // Points
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.accent.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.stars,
                      size: 16,
                      color: AppColors.accent,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      task.points.toString(),
                      style: const TextStyle(
                        color: AppColors.accent,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),

              // Action button
              if (isCompleted) ...[
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.check_circle_outline),
                  color: AppColors.success,
                  onPressed: () async {
                    await ref.read(tasksProvider.notifier).approveTask(task.id);
                  },
                  tooltip: 'Approve',
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return AppColors.primary;
      case 'completed':
        return AppColors.warning;
      case 'approved':
        return AppColors.success;
      default:
        return AppColors.textSecondary;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'pending':
        return Icons.radio_button_unchecked;
      case 'completed':
        return Icons.pending;
      case 'approved':
        return Icons.check_circle;
      default:
        return Icons.help_outline;
    }
  }

  void _showTaskDetails(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      builder: (context) => _TaskDetailsSheet(task: task),
    );
  }
}

class _TaskDetailsSheet extends ConsumerWidget {
  const _TaskDetailsSheet({required this.task});

  final Task task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  task.title,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          if (task.description != null) ...[
            const SizedBox(height: 8),
            Text(
              task.description!,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              const Icon(Icons.stars, color: AppColors.accent),
              const SizedBox(width: 8),
              Text(
                '${task.points} points',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
          if (task.assignedToName != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.person, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  'Assigned to ${task.assignedToName}',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ],
            ),
          ],
          const SizedBox(height: 24),
          Row(
            children: [
              if (task.status == 'pending') ...[
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await ref.read(tasksProvider.notifier).deleteTask(task.id);
                      if (context.mounted) Navigator.of(context).pop();
                    },
                    icon: const Icon(Icons.delete_outline),
                    label: const Text('Delete'),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              if (task.status == 'completed')
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () async {
                      await ref.read(tasksProvider.notifier).approveTask(task.id);
                      if (context.mounted) Navigator.of(context).pop();
                    },
                    icon: const Icon(Icons.check),
                    label: const Text('Approve'),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
