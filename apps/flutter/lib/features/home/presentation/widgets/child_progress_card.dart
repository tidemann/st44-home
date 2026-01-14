import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

/// Card showing a child's task progress and points.
class ChildProgressCard extends StatelessWidget {
  const ChildProgressCard({
    required this.childName,
    this.completedTasks = 0,
    this.totalTasks = 0,
    this.points = 0,
    this.avatarUrl,
    super.key,
  });

  final String childName;
  final int completedTasks;
  final int totalTasks;
  final int points;
  final String? avatarUrl;

  @override
  Widget build(BuildContext context) {
    final completionRate =
        totalTasks > 0 ? (completedTasks / totalTasks) : 0.0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Avatar
            CircleAvatar(
              radius: 28,
              backgroundColor: AppColors.primary.withOpacity(0.1),
              backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl!) : null,
              child: avatarUrl == null
                  ? Text(
                      childName.isNotEmpty ? childName[0].toUpperCase() : '?',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                    )
                  : null,
            ),
            const SizedBox(width: 16),

            // Child info and progress
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    childName,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        Icons.task_alt,
                        size: 16,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$completedTasks/$totalTasks tasks',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                      ),
                      const SizedBox(width: 12),
                      Icon(
                        Icons.stars,
                        size: 16,
                        color: AppColors.accent,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$points pts',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Progress bar
                  LinearProgressIndicator(
                    value: completionRate,
                    backgroundColor: AppColors.success.withOpacity(0.2),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.success,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
