import 'package:flutter/material.dart';

/// Quick add floating action button for creating new tasks.
class QuickAddButton extends StatelessWidget {
  const QuickAddButton({
    required this.onPressed,
    super.key,
  });

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.extended(
      onPressed: onPressed,
      icon: const Icon(Icons.add),
      label: const Text('New Task'),
    );
  }
}
