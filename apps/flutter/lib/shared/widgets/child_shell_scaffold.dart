import 'package:flutter/material.dart';

import 'child_bottom_nav.dart';

/// Shell scaffold with child bottom navigation.
///
/// Provides persistent bottom navigation for child users.
class ChildShellScaffold extends StatelessWidget {
  const ChildShellScaffold({
    required this.child,
    super.key,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: const ChildBottomNav(),
    );
  }
}
