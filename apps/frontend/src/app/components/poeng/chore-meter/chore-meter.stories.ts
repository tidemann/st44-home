import type { Meta, StoryObj } from '@storybook/angular';
import { ChoreMeter } from './chore-meter';

/**
 * ChoreMeter shows one 7 px pill per chore today: done green, open track,
 * overdue rust. Never yellow. The meter is hidden from assistive tech, because
 * the "1 av 3 gjort" text next to it carries the number.
 *
 * Part of the Diddit! Poeng look - Meters.
 */
const meta: Meta<ChoreMeter> = {
  title: 'Components/Poeng/ChoreMeter',
  component: ChoreMeter,
  tags: ['autodocs'],
  argTypes: {
    states: {
      control: 'object',
      description: "One entry per chore today: 'done', 'open' or 'late'",
    },
  },
  decorators: [
    () => ({
      template: `<div style="width: 85px; padding: 16px; background: #ffffff;"><story /></div>`,
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
type Story = StoryObj<ChoreMeter>;

/** One of three chores done, two still open */
export const OneOfThreeDone: Story = {
  args: {
    states: ['done', 'open', 'open'],
  },
};

/** Every chore done today */
export const AllDone: Story = {
  args: {
    states: ['done', 'done', 'done'],
  },
};

/** One chore is overdue (rust) */
export const WithOverdue: Story = {
  args: {
    states: ['done', 'late', 'open'],
  },
};

/** Nothing ticked yet */
export const NoneDone: Story = {
  args: {
    states: ['open', 'open', 'open', 'open'],
  },
};

/** A busy day with many chores */
export const ManyChores: Story = {
  args: {
    states: ['done', 'done', 'late', 'open', 'open', 'open'],
  },
};
