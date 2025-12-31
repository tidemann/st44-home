import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/models/models.dart';
import '../providers/providers.dart';

/// Family page - Household members and children.
class FamilyPage extends ConsumerWidget {
  const FamilyPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(familyProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Family'),
      ),
      body: switch (state) {
        FamilyLoading() => const Center(
            child: CircularProgressIndicator(),
          ),
        FamilyError(:final message) => _ErrorView(
            message: message,
            onRetry: () => ref.read(familyProvider.notifier).refresh(),
          ),
        FamilyNoHousehold() => const _NoHouseholdView(),
        FamilyLoaded(:final members, :final children) => RefreshIndicator(
            onRefresh: () => ref.read(familyProvider.notifier).refresh(),
            child: _FamilyContent(members: members, children: children),
          ),
      },
      floatingActionButton: state is FamilyLoaded
          ? FloatingActionButton.extended(
              onPressed: () => _showAddChildDialog(context, ref),
              icon: const Icon(Icons.person_add),
              label: const Text('Add Child'),
            )
          : null,
    );
  }

  void _showAddChildDialog(BuildContext context, WidgetRef ref) {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Child'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Child Name',
            hintText: 'Enter name',
          ),
          textCapitalization: TextCapitalization.words,
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (controller.text.trim().isNotEmpty) {
                await ref.read(familyProvider.notifier).addChild(
                      controller.text.trim(),
                    );
                if (context.mounted) Navigator.of(context).pop();
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}

class _FamilyContent extends StatelessWidget {
  const _FamilyContent({
    required this.members,
    required this.children,
  });

  final List<HouseholdMember> members;
  final List<ChildProfile> children;

  @override
  Widget build(BuildContext context) {
    final parents = members.where((m) => m.role == 'parent').toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Parents section
        Text(
          'Parents',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        if (parents.isEmpty)
          _EmptyCard(message: 'No parents in household')
        else
          ...parents.map((parent) => _MemberCard(member: parent)),
        const SizedBox(height: 24),

        // Children section
        Text(
          'Children',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        if (children.isEmpty)
          _EmptyCard(message: 'No children yet. Add a child to get started!')
        else
          ...children.map((child) => _ChildCard(child: child)),

        // Bottom padding for FAB
        const SizedBox(height: 80),
      ],
    );
  }
}

class _MemberCard extends StatelessWidget {
  const _MemberCard({required this.member});

  final HouseholdMember member;

  @override
  Widget build(BuildContext context) {
    final user = member.user;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppColors.primary.withOpacity(0.1),
          child: Text(
            (user?.firstName ?? 'P')[0].toUpperCase(),
            style: const TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          user != null ? '${user.firstName} ${user.lastName}' : 'Parent',
        ),
        subtitle: Text(
          member.role.toUpperCase(),
          style: const TextStyle(
            color: AppColors.primary,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}

class _ChildCard extends StatelessWidget {
  const _ChildCard({required this.child});

  final ChildProfile child;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppColors.accent.withOpacity(0.1),
          child: Text(
            child.name[0].toUpperCase(),
            style: const TextStyle(
              color: AppColors.accent,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(child.name),
        subtitle: Row(
          children: [
            const Icon(Icons.stars, size: 14, color: AppColors.accent),
            const SizedBox(width: 4),
            Text('${child.totalPoints} points'),
          ],
        ),
        trailing: child.userId != null
            ? const Chip(
                label: Text('Has Login'),
                backgroundColor: AppColors.successLight,
              )
            : TextButton(
                onPressed: () {
                  // TODO: Create login for child
                },
                child: const Text('Create Login'),
              ),
        onTap: () {
          // TODO: Show child details
        },
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Text(
            message,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
        ),
      ),
    );
  }
}

class _NoHouseholdView extends StatelessWidget {
  const _NoHouseholdView();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.family_restroom,
              size: 64,
              color: AppColors.textTertiary,
            ),
            const SizedBox(height: 16),
            Text(
              'No household yet',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Create or join a household to manage your family',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () {
                // TODO: Create household flow
              },
              icon: const Icon(Icons.add),
              label: const Text('Create Household'),
            ),
          ],
        ),
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
