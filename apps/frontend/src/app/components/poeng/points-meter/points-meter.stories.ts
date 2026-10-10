import type { Meta, StoryObj } from '@storybook/angular';
import { PointsMeter } from './points-meter';

/**
 * PointsMeter draws segmented 14 px pills. On white the filled cells are yellow;
 * on the yellow tick screen they are ink on the darker gold track. A meter that
 * is not full never looks full (99 % leaves the last cell empty).
 *
 * The meter is hidden from assistive tech: the number always sits beside it.
 *
 * Part of the Diddit! Poeng look - Meters.
 */
const meta: Meta<PointsMeter> = {
  title: 'Components/Poeng/PointsMeter',
  component: PointsMeter,
  tags: ['autodocs'],
  argTypes: {
    segments: {
      control: { type: 'number', min: 1, max: 20, step: 1 },
      description: 'Number of segments',
    },
    value: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Share filled, 0..1',
    },
    onYellow: {
      control: 'boolean',
      description: 'Drawn on the yellow tick screen (ink on yellow track)',
    },
  },
  decorators: [
    () => ({
      template: `<div style="width: 300px; padding: 16px; background: #ffffff;"><story /></div>`,
    }),
  ],
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
};

export default meta;
type Story = StoryObj<PointsMeter>;

/** Empty: no points towards the goal yet */
export const Empty: Story = {
  args: {
    segments: 10,
    value: 0,
    onYellow: false,
  },
};

/** Part way: 40 of 100 poeng */
export const PartWay: Story = {
  args: {
    segments: 10,
    value: 0.4,
    onYellow: false,
  },
};

/** Almost there: 99 % still leaves the last cell empty */
export const AlmostFull: Story = {
  args: {
    segments: 10,
    value: 0.99,
    onYellow: false,
  },
};

/** Full: enough points */
export const Full: Story = {
  args: {
    segments: 10,
    value: 1,
    onYellow: false,
  },
};

/** Fewer, wider segments */
export const FiveSegments: Story = {
  args: {
    segments: 5,
    value: 0.6,
    onYellow: false,
  },
};

/** On the yellow tick screen: ink cells on the darker gold track */
export const OnYellow: Story = {
  args: {
    segments: 10,
    value: 0.7,
    onYellow: true,
  },
  decorators: [
    () => ({
      template: `<div style="width: 300px; padding: 16px; background: var(--yellow);"><story /></div>`,
    }),
  ],
};
