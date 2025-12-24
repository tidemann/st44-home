import type { Preview } from '@storybook/angular';
import { setCompodocJson } from '@storybook/addon-docs/angular';

// Import global styles
import '../src/styles.css';

// Set up Compodoc documentation (will be generated)
try {
  const docJson = require('../documentation.json');
  setCompodocJson(docJson);
} catch (e) {
  // Compodoc documentation not generated yet
  console.warn('Compodoc documentation not found. Run npm run storybook:docs to generate.');
}

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#F8F9FF' },
        { name: 'dark', value: '#1E293B' },
        { name: 'white', value: '#FFFFFF' },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1440px', height: '900px' },
          type: 'desktop',
        },
      },
    },
  },
};

export default preview;
