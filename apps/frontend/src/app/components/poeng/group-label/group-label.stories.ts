import type { Meta, StoryObj } from '@storybook/angular';
import { GroupLabel } from './group-label';

/**
 * GroupLabel heads a group of rows ("Forfalt", "I dag", "Gjort i dag",
 * "Hentet før") with an optional count or summary on the right.
 * Overdue groups are rust.
 *
 * Part of the Diddit! Poeng look - Labels.
 */
const meta: Meta<GroupLabel> = {
  title: 'Components/Poeng/GroupLabel',
  component: GroupLabel,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Group name (required)',
    },
    right: {
      control: 'text',
      description: 'Optional count or summary on the right. Empty hides it',
    },
    overdue: {
      control: 'boolean',
      description: 'Rust label for the overdue group',
    },
  },
  decorators: [
    () => ({
      template: `<div style="max-width: 342px; padding: 16px; background: #f6f6f4;"><story /></div>`,
    }),
  ],
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'heading-order', enabled: true },
        ],
      },
    },
  },
};

export default meta;
type Story = StoryObj<GroupLabel>;

/** Today's chores */
export const Today: Story = {
  args: {
    label: 'I dag',
    right: '',
    overdue: false,
  },
};

/** Today's chores with a count */
export const WithCount: Story = {
  args: {
    label: 'I dag',
    right: '3 igjen',
    overdue: false,
  },
};

/** Overdue group in rust */
export const Overdue: Story = {
  args: {
    label: 'Forfalt',
    right: '2',
    overdue: true,
  },
};

/** Done today, with a points summary */
export const DoneToday: Story = {
  args: {
    label: 'Gjort i dag',
    right: '+25 p',
    overdue: false,
  },
};

/** Rewards collected earlier */
export const CollectedBefore: Story = {
  args: {
    label: 'Hentet før',
    right: '',
    overdue: false,
  },
};
