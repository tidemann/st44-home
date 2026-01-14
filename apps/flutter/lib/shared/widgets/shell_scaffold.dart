import 'package:flutter/material.dart';

import 'bottom_nav.dart';

/// Shell scaffold with bottom navigation.
///
/// Provides persistent bottom navigation for parent users.
class ShellScaffold extends StatelessWidget {
  const ShellScaffold({
    required this.child,
    super.key,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: const BottomNav(),
    );
  }
}
