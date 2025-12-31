import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'router/router.dart';

/// The root widget of the Diddit! app.
///
/// Sets up the MaterialApp with:
/// - GoRouter for navigation
/// - Theme configuration (light/dark)
/// - Riverpod state management
class DidditApp extends ConsumerWidget {
  const DidditApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Diddit!',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
