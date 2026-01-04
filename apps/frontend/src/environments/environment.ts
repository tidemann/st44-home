// These placeholders are replaced during the Docker build process
// If not replaced, falls back to development defaults
const BUILD_TIME = 'BUILD_TIME_PLACEHOLDER';
const GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID_PLACEHOLDER';

export const environment = {
  production: true,
  apiUrl: '',
  googleClientId: GOOGLE_CLIENT_ID.startsWith('GOOGLE_CLIENT_ID') ? '' : GOOGLE_CLIENT_ID,
  version: '1.0.0',
  buildTime: BUILD_TIME.startsWith('BUILD_TIME') ? 'development' : BUILD_TIME,
};
