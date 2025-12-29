/**
 * HTTP Interceptors
 *
 * Functional interceptors for Angular's HttpClient.
 * Register these in app.config.ts with withInterceptors().
 *
 * @example
 * import { authInterceptor, errorInterceptor, loadingInterceptor } from './interceptors';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(
 *       withInterceptors([authInterceptor, errorInterceptor, loadingInterceptor])
 *     ),
 *   ],
 * };
 */

export { authInterceptor } from './auth.interceptor';
export { errorInterceptor } from './error.interceptor';
export { loadingInterceptor, LoadingService, SKIP_LOADING } from './loading.interceptor';
