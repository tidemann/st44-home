/**
 * i18n Configuration Module
 *
 * Configures i18next for backend internationalization.
 * Supports Norwegian (default) and English languages.
 * Language detection from Accept-Language header and X-Language custom header.
 */

import i18next, { type TFunction } from 'i18next';
import Backend from 'i18next-fs-backend';
import * as middleware from 'i18next-http-middleware';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of this module for locales path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supported languages
export const SUPPORTED_LANGUAGES = ['no', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'no';

// Type augmentation for Fastify request to include i18next's t function
declare module 'fastify' {
  interface FastifyRequest {
    t: TFunction;
    language: string;
  }
}

/**
 * Initialize i18next with file system backend.
 * Call this once at server startup.
 */
export async function initI18n(): Promise<typeof i18next> {
  // Create path that works on all platforms (forward slashes for i18next)
  const localesPath = join(__dirname, '..', '..', 'locales', '{{lng}}', '{{ns}}.json').replace(
    /\\/g,
    '/',
  );

  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      // Default to Norwegian
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...SUPPORTED_LANGUAGES],

      // Don't load resources on init - load on demand
      preload: [...SUPPORTED_LANGUAGES],

      // Language detection order
      detection: {
        // Look in these places (in order) - header checks Accept-Language
        order: ['header', 'querystring'],
        // Query string parameter name
        lookupQuerystring: 'lang',
        // Disable caching
        caches: false,
      },

      // Backend options - load JSON files
      backend: {
        loadPath: localesPath,
      },

      // Namespace configuration
      ns: ['translation'],
      defaultNS: 'translation',

      // Interpolation options
      interpolation: {
        // No need to escape values for API responses
        escapeValue: false,
      },

      // Return key if translation is missing
      returnNull: false,
      returnEmptyString: false,
    });

  return i18next;
}

/**
 * Get the i18next middleware plugin for Fastify.
 * Adds req.t() and req.language to each request.
 */
export function getI18nMiddleware() {
  return middleware.plugin;
}

/**
 * Create a custom Fastify preHandler hook that adds i18n to requests.
 * Use this if the middleware plugin doesn't work correctly.
 */
export function createI18nHook() {
  return async function i18nHook(request: {
    headers: Record<string, unknown>;
    language?: string;
    t?: TFunction;
  }) {
    // Get language from Accept-Language header
    const acceptLanguage = request.headers['accept-language'] as string | undefined;
    const detectedLang = normalizeLanguage(acceptLanguage);

    // Set language on request
    request.language = detectedLang;

    // Create a bound translation function for this request's language
    request.t = ((key: string, options?: Record<string, unknown>) => {
      return i18next.t(key, { lng: detectedLang, ...options });
    }) as TFunction;
  };
}

/**
 * Get the i18next instance for use in services/utilities.
 */
export function getI18n() {
  return i18next;
}

/**
 * Translate a key using the provided language.
 * Useful for translating outside of request context.
 */
export function translate(
  key: string,
  language: SupportedLanguage = DEFAULT_LANGUAGE,
  options?: Record<string, unknown>,
): string {
  return i18next.t(key, { lng: language, ...options });
}

/**
 * Check if a language is supported.
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Parse Accept-Language header with quality values.
 * Returns the highest-priority supported language.
 *
 * Format: "en-US,en;q=0.9,no;q=0.8"
 * - Languages without q value have q=1.0
 * - Higher q values = higher priority
 */
export function normalizeLanguage(acceptLanguage: string | undefined): SupportedLanguage {
  if (!acceptLanguage) return DEFAULT_LANGUAGE;

  // Parse Accept-Language header into language/quality pairs
  const languages = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, qPart] = part.trim().split(';');
      const quality = qPart ? parseFloat(qPart.replace('q=', '')) : 1.0;
      // Get primary language code (e.g., 'en-US' -> 'en')
      const primary = lang.split('-')[0].toLowerCase();
      // Map Norwegian variants to 'no'
      const normalized = primary === 'nb' || primary === 'nn' ? 'no' : primary;
      return { lang: normalized, quality };
    })
    // Sort by quality descending
    .sort((a, b) => b.quality - a.quality);

  // Find the first supported language in priority order
  for (const { lang } of languages) {
    if (isSupportedLanguage(lang)) {
      return lang;
    }
  }

  // Fallback to default
  return DEFAULT_LANGUAGE;
}
