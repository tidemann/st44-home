# Diddit! Flutter App

Cross-platform mobile app for Diddit! family task management.

## Prerequisites

- Flutter SDK 3.24.0 or later
- Dart SDK 3.5.0 or later
- Xcode (for iOS development)
- Android Studio (for Android development)

## Setup

1. Install Flutter: https://docs.flutter.dev/get-started/install

2. Install dependencies:

   ```bash
   cd apps/flutter
   flutter pub get
   ```

3. Generate code (Riverpod, Freezed, JSON):

   ```bash
   dart run build_runner build --delete-conflicting-outputs
   ```

4. Run the app:
   ```bash
   flutter run
   ```

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── app.dart                  # App widget and configuration
├── router/                   # GoRouter configuration
├── core/
│   ├── constants/           # App constants
│   ├── theme/               # Theme configuration
│   └── utils/               # Utility functions
├── features/
│   ├── auth/                # Authentication feature
│   ├── home/                # Home dashboard
│   ├── tasks/               # Tasks management
│   ├── family/              # Family members
│   ├── rewards/             # Rewards system
│   ├── settings/            # App settings
│   ├── progress/            # Leaderboard/stats
│   └── child/               # Child dashboard
└── shared/
    ├── widgets/             # Shared widgets
    ├── services/            # Shared services
    ├── models/              # Shared models
    └── providers/           # Shared providers
```

## Commands

```bash
# Run app
flutter run

# Run tests
flutter test

# Analyze code
flutter analyze

# Format code
dart format .

# Generate code
dart run build_runner build --delete-conflicting-outputs

# Build APK
flutter build apk --release

# Build iOS
flutter build ios --release
```

## MCP Server Integration

For enhanced Flutter development with Claude Code, install:

1. **Official Dart & Flutter MCP Server**:

   ```json
   {
     "mcpServers": {
       "dart": {
         "command": "dart",
         "args": ["mcp-server"]
       }
     }
   }
   ```

2. **Flutter MCP** (real-time documentation):
   ```bash
   npx flutter-mcp
   ```

## Related Documentation

- Agent Spec: `.github/agents/flutter-agent.md`
- Skill: `.claude/skills/flutter/SKILL.md`
- Epic: GitHub Issue #360

## API Integration

The app connects to the same Fastify backend as the web app:

- Base URL: Configured in environment
- Authentication: JWT tokens
- Endpoints: `/api/*`

## License

Proprietary - All rights reserved
