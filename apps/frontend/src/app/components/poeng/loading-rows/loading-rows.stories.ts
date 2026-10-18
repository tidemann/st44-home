import type { Meta, StoryObj } from '@storybook/angular';
import { LoadingRows } from './loading-rows';

/**
 * LoadingRows is rule 7's loading state: grey placeholder rows in the shape of the rows that
 * are coming, not a sentence. Desktop only (1024 px and wider) — set the viewport wide to see
 * it.
 *
 * Part of the Diddit! Poeng look - Desktop: rules for all pages.
 */
const meta: Meta<LoadingRows> = {
  title: 'Components/Poeng/LoadingRows',
  component: LoadingRows,
  tags: ['autodocs'],
  argTypes: {
    count: {
      control: { type: 'number', min: 1, max: 6 },
      description: 'How many placeholder rows to draw',
    },
    label: {
      control: 'text',
      description: 'What a screen reader hears while the rows show',
    },
  },
  decorators: [
    () => ({
      template: `<div style="max-width: 880px; padding: 16px; background: #f6f6f4;"><story /></div>`,
    }),
  ],
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
};

export default meta;
type Story = StoryObj<LoadingRows>;

/** The three rows the pictures draw */
export const Default: Story = {
  args: { count: 3 },
};

/** One row, for a short list */
export const Single: Story = {
  args: { count: 1 },
};

/** A longer list */
export const Five: Story = {
  args: { count: 5 },
};
