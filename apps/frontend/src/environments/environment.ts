// BUILD_TIME_PLACEHOLDER is replaced during the Docker build process
// If not replaced, falls back to 'development' to indicate local dev
const BUILD_TIME = 'BUILD_TIME_PLACEHOLDER';

export const environment = {
  production: true,
  apiUrl: '',
  googleClientId: '', // Add your Google OAuth Client ID here for production
  version: '1.0.0',
  buildTime: BUILD_TIME.startsWith('BUILD_TIME') ? 'development' : BUILD_TIME,
};
