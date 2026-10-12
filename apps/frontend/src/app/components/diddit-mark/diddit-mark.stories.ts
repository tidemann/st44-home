import type { Meta, StoryObj } from '@storybook/angular';
import { DidditMark } from './diddit-mark';

/**
 * The Diddit mark: the ink rounded square with the yellow tick, approved on ST-812.
 * Built from the tick badge of the signed-off tick screen — no new shape, no new colour.
 *
 * Two colour pairs only. No outline, no shadow, no rotation. Minimum size 24 px.
 */
const meta: Meta<DidditMark> = {
  title: 'Components/DidditMark',
  component: DidditMark,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'number', min: 24, max: 192, step: 2 },
      description: 'Drawn size in px (54 on the login, 24 minimum)',
    },
    inverted: {
      control: 'boolean',
      description: 'Yellow square with an ink tick',
    },
    label: {
      control: 'text',
      description: 'Accessible name; empty = decorative (the wordmark carries the name)',
    },
  },
  decorators: [
    () => ({
      template: `<div style="display: inline-flex; padding: 24px; background: #f6b93b;"><story /></div>`,
    }),
  ],
};

export default meta;
type Story = StoryObj<DidditMark>;

/** The mark as on the login: 54 px, ink square, yellow tick */
export const Default: Story = {
  args: { size: 54, inverted: false, label: 'Diddit' },
};

/** Inverted: the app icon on a dark ground */
export const Inverted: Story = {
  args: { size: 54, inverted: true, label: 'Diddit' },
  decorators: [
    () => ({
      template: `<div style="display: inline-flex; padding: 24px; background: #17120a;"><story /></div>`,
    }),
  ],
};

/** Minimum drawn size: 24 px */
export const Minimum: Story = {
  args: { size: 24, inverted: false, label: 'Diddit' },
};

/** App icon size on white */
export const AppIcon: Story = {
  args: { size: 120, inverted: false, label: 'Diddit' },
  decorators: [
    () => ({
      template: `<div style="display: inline-flex; padding: 32px; background: #ffffff;"><story /></div>`,
    }),
  ],
};
