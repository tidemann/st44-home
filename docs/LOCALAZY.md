# Localazy Translation Management

This document describes how to use Localazy for managing translations in the st44-home project.

## Overview

Localazy is used to manage translations across the platform. Currently configured for:

- ✅ **Angular Frontend** (XLIFF files)
- ⏳ **Flutter App** (ARB files - planned)
- ⏳ **Backend** (JSON files - planned)

## Setup

### 1. Install Localazy CLI

The CLI is already installed as a dev dependency:

```bash
npm install  # Installs @localazy/cli
```

### 2. Configure API Keys

To use Localazy CLI, you need to set up API keys:

#### For Local Development

Create a `.env` file in the project root (not tracked in git):

```bash
LOCALAZY_READ_KEY=your_read_key_here
LOCALAZY_WRITE_KEY=your_write_key_here
```

Get your API keys from [Localazy Dashboard → Settings → API Keys](https://localazy.com/p/st44-home/settings/keys)

#### For CI/CD (GitHub Actions)

Add the following secrets to GitHub repository settings:

1. Go to **Repository Settings** → **Secrets and variables** → **Actions**
2. Add new repository secrets:
   - `LOCALAZY_READ_KEY` - Read-only key for downloading translations
   - `LOCALAZY_WRITE_KEY` - Write key for uploading source strings

## Configuration

The `localazy.json` file in the project root defines:

- **Source language**: Norwegian (`no`)
- **Target languages**: English (`en`)
- **Upload**: Norwegian source strings from `apps/frontend/src/locale/messages.xlf`
- **Download**: Translated files to `apps/frontend/src/locale/messages.${lang}.xlf`

## Workflow

### Developer Workflow

1. **Write code in Norwegian** (source language)
   - Use `$localize` in TypeScript files
   - Use `i18n` attributes in HTML templates

2. **Extract source strings** (generates `messages.xlf`)

   ```bash
   cd apps/frontend
   npm run extract-i18n
   ```

3. **Upload to Localazy** (from project root)

   ```bash
   npx localazy upload
   ```

   - Requires `LOCALAZY_WRITE_KEY`
   - Sends Norwegian source strings to Localazy

4. **Translators work in Localazy Web UI**
   - Access [Localazy project dashboard](https://localazy.com/p/st44-home)
   - Translate strings from Norwegian to English
   - Review and approve translations

5. **Download translations**

   ```bash
   npx localazy download
   ```

   - Requires `LOCALAZY_READ_KEY`
   - Downloads `messages.en.xlf` (English translations)
   - Updates existing translation files

6. **Build with translations**
   ```bash
   cd apps/frontend
   npm run build  # Builds both Norwegian and English versions
   ```

### CI/CD Workflow (Automated)

GitHub Actions automatically downloads translations before each build:

**Workflows:**

1. **`.github/workflows/localazy-sync.yml`** - Dedicated translation sync workflow
   - Runs on push to main
   - Runs on pull requests
   - Runs daily at 2 AM UTC (scheduled)
   - Can be triggered manually via workflow_dispatch
   - Shows translation statistics

2. **`.github/workflows/ci.yml`** - Main CI workflow
   - Downloads translations before building frontend
   - Ensures builds have latest translations

**Translation Download Step:**

```yaml
- name: Download Localazy translations
  run: npx localazy download
  env:
    LOCALAZY_READ_KEY: ${{ secrets.LOCALAZY_READ_KEY }}
```

This ensures production builds always have the latest translations from Localazy.

## Commands Reference

### Manual Commands

```bash
# Upload source strings to Localazy
npx localazy upload

# Download translations from Localazy
npx localazy download

# Check Localazy CLI version
npx localazy --version

# View Localazy help
npx localazy --help
```

### Angular i18n Commands

```bash
# Extract translatable strings (generates messages.xlf)
cd apps/frontend
npm run extract-i18n

# Build with all locales (Norwegian + English)
npm run build

# Build single locale for testing
ng build --localize=no    # Norwegian only
ng build --localize=en    # English only

# Serve specific locale for development
ng serve --configuration=development,no
ng serve --configuration=development,en
```

## File Structure

```
st44-home/
├── localazy.json                          # Localazy CLI configuration
├── apps/
│   └── frontend/
│       └── src/
│           └── locale/
│               ├── messages.xlf           # Norwegian source (uploaded)
│               ├── messages.en.xlf        # English (downloaded from Localazy)
│               └── messages.no.xlf        # Norwegian (copy of source)
└── docs/
    └── LOCALAZY.md                        # This file
```

## Troubleshooting

### "API key is missing" error

**Problem**: `npx localazy upload/download` fails with authentication error

**Solution**:

1. Check that `.env` file exists with `LOCALAZY_READ_KEY` and `LOCALAZY_WRITE_KEY`
2. Verify keys are correct in [Localazy Dashboard](https://localazy.com/p/st44-home/settings/keys)
3. Ensure keys have correct permissions (read/write)

### "File not found" error on upload

**Problem**: `npx localazy upload` can't find `messages.xlf`

**Solution**:

1. Run `npm run extract-i18n` from `apps/frontend` first
2. Verify file exists at `apps/frontend/src/locale/messages.xlf`
3. Check `localazy.json` file paths are correct

### Translations not showing in build

**Problem**: Built app still shows Norwegian text instead of English

**Solution**:

1. Run `npx localazy download` to get latest translations
2. Verify `messages.en.xlf` exists and has translations
3. Rebuild with `ng build --localize`
4. Check Angular configuration in `angular.json`

### Missing translations in English build

**Problem**: Some strings still appear in Norwegian in English build

**Solution**:

1. Check if strings are marked for translation with `i18n` or `$localize`
2. Run `npm run extract-i18n` to extract new strings
3. Upload to Localazy: `npx localazy upload`
4. Add English translations in Localazy web UI
5. Download: `npx localazy download`
6. Rebuild application

## Best Practices

1. **Always use Norwegian as source**: Write all new strings in Norwegian first
2. **Extract regularly**: Run `extract-i18n` after adding new user-facing strings
3. **Upload after extraction**: Keep Localazy in sync with latest strings
4. **Review translations**: Check Localazy web UI for translation quality
5. **Test both locales**: Verify app works in both Norwegian and English
6. **Don't edit translation files manually**: Always use Localazy for translations

## Adding New Translatable Strings

### In HTML Templates

```html
<!-- Before -->
<h1>Velkommen tilbake!</h1>

<!-- After -->
<h1 i18n="@@login.title">Velkommen tilbake!</h1>
```

### In TypeScript Files

```typescript
// Before
const message = 'Oppgaven er fullført';

// After
const message = $localize`:@@task.completed:Oppgaven er fullført`;
```

### Workflow After Adding Strings

1. Extract strings: `npm run extract-i18n`
2. Upload to Localazy: `npx localazy upload`
3. Translate in Localazy web UI
4. Download: `npx localazy download`
5. Test: `npm run build && npm start`

## References

- [Localazy Documentation](https://localazy.com/docs/cli)
- [Angular i18n Guide](https://angular.dev/guide/i18n)
- [Localazy Angular Integration](https://localazy.com/angular)
- [Epic #569: Multilingual Support](https://github.com/tidemann/st44-home/issues/569)

## Support

For issues with Localazy integration:

1. Check this documentation first
2. Review [Localazy CLI docs](https://localazy.com/docs/cli)
3. Create GitHub issue with `i18n` label
4. Contact Localazy support for platform issues
