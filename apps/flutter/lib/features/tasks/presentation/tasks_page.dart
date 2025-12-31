import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/models/models.dart';
import '../providers/providers.dart';
import 'widgets/task_card.dart';

/// Tasks page - List of all tasks.
class TasksPage extends ConsumerWidget {
  const TasksPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(tasksProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tasks'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              // TODO: Show filter options
            },
          ),
        ],
      ),
      body: switch (state) {
        TasksLoading() => const Center(
            child: CircularProgressIndicator(),
          ),
        TasksError(:final message) => _ErrorView(
            message: message,
            onRetry: () => ref.read(tasksProvider.notifier).refresh(),
          ),
        TasksLoaded(:final tasks) => tasks.isEmpty
            ? const _EmptyView()
            : RefreshIndicator(
                onRefresh: () => ref.read(tasksProvider.notifier).refresh(),
                child: _TasksList(tasks: tasks),
              ),
      },
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateTaskDialog(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('New Task'),
      ),
    );
  }

  void _showCreateTaskDialog(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => const CreateTaskSheet(),
    );
  }
}

class _TasksList extends StatelessWidget {
  const _TasksList({required this.tasks});

  final List<Task> tasks;

  @override
  Widget build(BuildContext context) {
    // Group tasks by status
    final pending = tasks.where((t) => t.status == 'pending').toList();
    final needsApproval = tasks.where((t) => t.status == 'completed').toList();
    final approved = tasks.where((t) => t.status == 'approved').toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (needsApproval.isNotEmpty) ...[
          _SectionHeader(
            title: 'Needs Approval',
            count: needsApproval.length,
            color: AppColors.warning,
          ),
          ...needsApproval.map((task) => TaskCard(task: task)),
          const SizedBox(height: 24),
        ],
        if (pending.isNotEmpty) ...[
          _SectionHeader(
            title: 'Pending',
            count: pending.length,
            color: AppColors.primary,
          ),
          ...pending.map((task) => TaskCard(task: task)),
          const SizedBox(height: 24),
        ],
        if (approved.isNotEmpty) ...[
          _SectionHeader(
            title: 'Completed',
            count: approved.length,
            color: AppColors.success,
          ),
          ...approved.map((task) => TaskCard(task: task)),
        ],
        // Bottom padding for FAB
        const SizedBox(height: 80),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.count,
    required this.color,
  });

  final String title;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 24,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              count.toString(),
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.task_alt,
            size: 64,
            color: AppColors.textTertiary,
          ),
          const SizedBox(height: 16),
          Text(
            'No tasks yet',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Create your first task to get started',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textTertiary,
                ),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: AppColors.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Something went wrong',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Bottom sheet for creating a new task.
class CreateTaskSheet extends ConsumerStatefulWidget {
  const CreateTaskSheet({super.key});

  @override
  ConsumerState<CreateTaskSheet> createState() => _CreateTaskSheetState();
}

class _CreateTaskSheetState extends ConsumerState<CreateTaskSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _pointsController = TextEditingController(text: '10');
  bool _isLoading = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _pointsController.dispose();
    super.dispose();
  }

  Future<void> _handleCreate() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final success = await ref.read(tasksProvider.notifier).createTask(
          CreateTaskRequest(
            title: _titleController.text.trim(),
            description: _descriptionController.text.trim().isEmpty
                ? null
                : _descriptionController.text.trim(),
            points: int.parse(_pointsController.text),
          ),
        );

    if (mounted) {
      setState(() => _isLoading = false);
      if (success) {
        Navigator.of(context).pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Text(
                  'Create Task',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Task Title',
                hintText: 'What needs to be done?',
              ),
              textCapitalization: TextCapitalization.sentences,
              enabled: !_isLoading,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter a task title';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                hintText: 'Add more details...',
              ),
              textCapitalization: TextCapitalization.sentences,
              maxLines: 2,
              enabled: !_isLoading,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _pointsController,
              decoration: const InputDecoration(
                labelText: 'Points',
                prefixIcon: Icon(Icons.stars),
              ),
              keyboardType: TextInputType.number,
              enabled: !_isLoading,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter points';
                }
                final points = int.tryParse(value);
                if (points == null || points < 1) {
                  return 'Points must be at least 1';
                }
                return null;
              },
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _isLoading ? null : _handleCreate,
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Create Task'),
            ),
          ],
        ),
      ),
    );
  }
}
