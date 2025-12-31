import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/models/models.dart';
import '../providers/providers.dart';

/// Rewards page - List of available rewards.
class RewardsPage extends ConsumerWidget {
  const RewardsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(rewardsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rewards'),
      ),
      body: switch (state) {
        RewardsLoading() => const Center(
            child: CircularProgressIndicator(),
          ),
        RewardsError(:final message) => _ErrorView(
            message: message,
            onRetry: () => ref.read(rewardsProvider.notifier).refresh(),
          ),
        RewardsLoaded(:final rewards) => rewards.isEmpty
            ? const _EmptyView()
            : RefreshIndicator(
                onRefresh: () => ref.read(rewardsProvider.notifier).refresh(),
                child: _RewardsList(rewards: rewards),
              ),
      },
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateRewardDialog(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('New Reward'),
      ),
    );
  }

  void _showCreateRewardDialog(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => const CreateRewardSheet(),
    );
  }
}

class _RewardsList extends StatelessWidget {
  const _RewardsList({required this.rewards});

  final List<Reward> rewards;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.85,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: rewards.length,
      itemBuilder: (context, index) => _RewardCard(reward: rewards[index]),
    );
  }
}

class _RewardCard extends ConsumerWidget {
  const _RewardCard({required this.reward});

  final Reward reward;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showRewardDetails(context, ref),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Reward icon/image area
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  gradient: AppColors.accentGradient,
                ),
                child: Center(
                  child: Icon(
                    Icons.card_giftcard,
                    size: 48,
                    color: Colors.white.withOpacity(0.9),
                  ),
                ),
              ),
            ),

            // Reward info
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    reward.title,
                    style: Theme.of(context).textTheme.titleMedium,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.stars,
                        size: 16,
                        color: AppColors.accent,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${reward.pointsCost} points',
                        style: TextStyle(
                          color: AppColors.accent,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showRewardDetails(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      builder: (context) => _RewardDetailsSheet(reward: reward),
    );
  }
}

class _RewardDetailsSheet extends ConsumerWidget {
  const _RewardDetailsSheet({required this.reward});

  final Reward reward;

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
                  reward.title,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          if (reward.description != null) ...[
            const SizedBox(height: 8),
            Text(
              reward.description!,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
          ],
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.accent.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.stars, color: AppColors.accent, size: 32),
                const SizedBox(width: 12),
                Text(
                  '${reward.pointsCost} points',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: AppColors.accent,
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Delete Reward?'),
                        content:
                            const Text('This action cannot be undone.'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(false),
                            child: const Text('Cancel'),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.of(context).pop(true),
                            child: const Text('Delete'),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true) {
                      await ref.read(rewardsProvider.notifier).deleteReward(reward.id);
                      if (context.mounted) Navigator.of(context).pop();
                    }
                  },
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Delete'),
                ),
              ),
            ],
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
            Icons.card_giftcard,
            size: 64,
            color: AppColors.textTertiary,
          ),
          const SizedBox(height: 16),
          Text(
            'No rewards yet',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Create rewards for your family to earn',
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

/// Bottom sheet for creating a new reward.
class CreateRewardSheet extends ConsumerStatefulWidget {
  const CreateRewardSheet({super.key});

  @override
  ConsumerState<CreateRewardSheet> createState() => _CreateRewardSheetState();
}

class _CreateRewardSheetState extends ConsumerState<CreateRewardSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _pointsController = TextEditingController(text: '50');
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

    final success = await ref.read(rewardsProvider.notifier).createReward(
          CreateRewardRequest(
            title: _titleController.text.trim(),
            description: _descriptionController.text.trim().isEmpty
                ? null
                : _descriptionController.text.trim(),
            pointsCost: int.parse(_pointsController.text),
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
                  'Create Reward',
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
                labelText: 'Reward Title',
                hintText: 'What can be earned?',
              ),
              textCapitalization: TextCapitalization.sentences,
              enabled: !_isLoading,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter a reward title';
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
                labelText: 'Points Cost',
                prefixIcon: Icon(Icons.stars),
              ),
              keyboardType: TextInputType.number,
              enabled: !_isLoading,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter points cost';
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
                  : const Text('Create Reward'),
            ),
          ],
        ),
      ),
    );
  }
}
