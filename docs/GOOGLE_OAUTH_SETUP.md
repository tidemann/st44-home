# Google OAuth Setup Guide

This guide explains how to configure Google OAuth authentication for the Diddit! application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Google Cloud Console Setup](#google-cloud-console-setup)
- [Backend Configuration](#backend-configuration)
- [Frontend Configuration](#frontend-configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

Google OAuth allows users to sign in with their Google accounts, eliminating the need to create and remember passwords. The implementation supports:

- **Login**: Existing users can sign in with Google
- **Registration**: New users can create accounts using Google
- **Account Linking**: Existing users can link their Google accounts
- **Auto-Fill**: User name and email are automatically populated from Google profile

## Prerequisites

- Google Cloud Platform account
- Project admin access to create OAuth credentials
- Domain or localhost for testing

## Google Cloud Console Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "Diddit App")
4. Click "Create"

### 2. Enable Google+ API (if required)

1. Navigate to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable" (if not already enabled)

### 3. Configure OAuth Consent Screen

1. Navigate to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type (or "Internal" for Google Workspace)
3. Click "Create"
4. Fill in required fields:
   - **App name**: Diddit!
   - **User support email**: your-email@example.com
   - **Developer contact email**: your-email@example.com
5. Click "Save and Continue"
6. Scopes: No additional scopes required (basic profile and email are automatic)
7. Click "Save and Continue"
8. Test users: Add your Google account for testing
9. Click "Save and Continue"

### 4. Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Configure settings:
   - **Name**: Diddit Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:4200` (development)
     - `https://your-domain.com` (production)
   - **Authorized redirect URIs**: (leave empty for Google Sign-In button)
5. Click "Create"
6. Copy your **Client ID** (format: `xxx.apps.googleusercontent.com`)
7. **Important**: You don't need the Client Secret for frontend Google Sign-In

## Backend Configuration

### 1. Set Environment Variable

Add the Google Client ID to your backend environment configuration:

```bash
# In infra/.env or apps/backend/.env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

### 2. Verify Backend Implementation

The backend is already configured to handle Google OAuth. The endpoint is:

```
POST /api/auth/google
Body: { "credential": "google-jwt-token" }
```

The backend will:

- Verify the ID token with Google
- Create a new user if email doesn't exist
- Link Google account to existing user if email matches
- Return JWT access/refresh tokens

## Frontend Configuration

### 1. Add Client ID to Environment Files

Update both environment files with your Google Client ID:

**apps/frontend/src/environments/environment.development.ts**:

```typescript
export const environment = {
  production: false,
  apiUrl: '',
  googleClientId: 'your-client-id-here.apps.googleusercontent.com',
  version: '1.0.0-dev',
  buildTime: 'development',
};
```

**apps/frontend/src/environments/environment.ts** (production):

```typescript
export const environment = {
  production: true,
  apiUrl: '',
  googleClientId: 'your-client-id-here.apps.googleusercontent.com',
  version: '1.0.0',
  buildTime: BUILD_TIME.startsWith('BUILD_TIME') ? 'development' : BUILD_TIME,
};
```

### 2. Verify Google Sign-In SDK

The Google Sign-In JavaScript SDK is already loaded in `apps/frontend/src/index.html`:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### 3. UI Integration

Google Sign-In buttons are already integrated in:

- **Login page**: `apps/frontend/src/app/auth/login.html`
- **Register page**: `apps/frontend/src/app/auth/register.html`

The buttons appear automatically when `googleClientId` is configured.

## Testing

### 1. Local Development Testing

1. Configure your Client ID in environment files
2. Start the backend: `npm run dev:backend`
3. Start the frontend: `npm run dev:frontend`
4. Navigate to `http://localhost:4200/login`
5. Click "Sign in with Google"
6. Select your Google account
7. Verify successful login

### 2. Backend Unit Tests

Run backend tests to verify Google OAuth endpoint:

```bash
cd apps/backend
npm test src/routes/auth.test.ts
```

### 3. Frontend Unit Tests

Run frontend tests to verify AuthService Google integration:

```bash
cd apps/frontend
npm test -- auth.service.spec.ts
```

### 4. End-to-End Testing

For E2E tests with Google OAuth, you'll need:

- Test Google account credentials
- Automated browser interaction with Google consent flow
- See `apps/frontend/e2e/auth/` for E2E test examples

## Troubleshooting

### Common Issues

#### 1. "Redirect URI Mismatch" Error

**Problem**: Google shows "redirect_uri_mismatch" error

**Solution**:

- Ensure `http://localhost:4200` is added to "Authorized JavaScript origins"
- Don't add redirect URIs (not needed for Google Sign-In button)
- Wait 5-10 minutes for changes to propagate

#### 2. Button Doesn't Appear

**Problem**: Google Sign-In button doesn't render

**Solution**:

- Check browser console for errors
- Verify `googleClientId` is set in environment file
- Ensure Google Sign-In SDK loaded: check Network tab for `gsi/client`
- Clear browser cache and reload

#### 3. "Invalid Client ID" Error

**Problem**: Backend rejects Google credential

**Solution**:

- Verify `GOOGLE_CLIENT_ID` matches frontend configuration
- Check that Client ID is from Google Cloud Console
- Ensure Client ID ends with `.apps.googleusercontent.com`

#### 4. User Not Created

**Problem**: Google authentication succeeds but user not created

**Solution**:

- Check backend logs for errors
- Verify database connection
- Ensure `users` table has OAuth columns: `oauth_provider`, `oauth_provider_id`
- Check that email is provided by Google (should be automatic)

#### 5. CORS Errors

**Problem**: Cross-origin errors when calling backend

**Solution**:

- Verify `CORS_ORIGIN` in backend `.env` allows frontend URL
- For development, use `CORS_ORIGIN=*` or `CORS_ORIGIN=http://localhost:4200`
- For production, set specific domain: `CORS_ORIGIN=https://your-domain.com`

### Database Schema

Ensure your `users` table includes OAuth columns:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,  -- Optional for OAuth-only users
  oauth_provider TEXT,  -- 'google', etc.
  oauth_provider_id TEXT,  -- Google user ID
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Security Best Practices

1. **Never commit Client IDs**: Use environment variables
2. **Use HTTPS in production**: Google OAuth requires secure origins
3. **Validate tokens server-side**: Always verify ID tokens with Google
4. **Limit scopes**: Only request necessary permissions
5. **Rate limiting**: Protect auth endpoints from abuse
6. **Monitor OAuth usage**: Check Google Cloud Console for anomalies

## Production Deployment

### 1. Update Authorized Origins

Before deploying to production:

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add production URL to "Authorized JavaScript origins":
   - `https://your-domain.com`
   - `https://www.your-domain.com` (if applicable)
4. Save changes
5. Wait 5-10 minutes for propagation

### 2. Environment Variables

Set production environment variables:

```bash
# Backend
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Frontend build-time configuration
# Update apps/frontend/src/environments/environment.ts
```

### 3. HTTPS Required

Google OAuth requires HTTPS in production. Ensure:

- SSL/TLS certificate installed
- Redirect HTTP to HTTPS
- Mixed content warnings resolved

## Additional Resources

- [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [google-auth-library (Backend)](https://github.com/googleapis/google-auth-library-nodejs)

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review backend logs: `apps/backend/logs/`
3. Check browser console for frontend errors
4. Create GitHub issue with error details
