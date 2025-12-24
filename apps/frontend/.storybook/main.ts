import type { StorybookConfig } from '@storybook/angular';
import { join, dirname } from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/angular',
    options: {
      builder: {
        useSWC: false,
      },
    },
  },
  docs: {
    autodocs: 'tag',
  },
  core: {
    disableTelemetry: true,
  },
  typescript: {
    check: false,
    reactDocgen: false,
  },
};

export default config;
