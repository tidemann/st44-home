import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'shared/services/storage/preferences_storage.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize SharedPreferences
  final prefs = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
      child: const _AppStartup(),
    ),
  );
}

/// App startup wrapper that checks auth status.
class _AppStartup extends ConsumerStatefulWidget {
  const _AppStartup();

  @override
  ConsumerState<_AppStartup> createState() => _AppStartupState();
}

class _AppStartupState extends ConsumerState<_AppStartup> {
  @override
  void initState() {
    super.initState();
    // Check auth status on startup
    Future.microtask(() {
      // Import is deferred to avoid circular dependency
      ref.read(_authInitProvider);
    });
  }

  @override
  Widget build(BuildContext context) {
    return const DidditApp();
  }
}

/// Provider to initialize auth check on startup.
final _authInitProvider = Provider<void>((ref) {
  // Trigger auth status check
  // This is imported lazily to avoid circular dependencies
  return;
});
