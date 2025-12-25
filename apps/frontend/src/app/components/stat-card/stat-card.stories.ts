import { Meta, StoryObj } from '@storybook/angular';
import { StatCard } from './stat-card';

/**
 * StatCard displays statistics with an icon, value, and label.
 * Used on dashboards to show metrics like tasks completed, points earned, etc.
 *
 * Part of the Diddit! Design System.
 */
const meta: Meta<StatCard> = {
  title: 'Components/StatCard',
  component: StatCard,
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'text',
      description: 'Emoji or icon character to display',
    },
    value: {
      control: 'text',
      description: 'Stat value (number or string like "3/8")',
    },
    label: {
      control: 'text',
      description: 'Label describing the stat',
    },
    gradient: {
      control: 'text',
      description: 'Optional custom CSS class for gradient',
    },
  },
};

export default meta;
type Story = StoryObj<StatCard>;

/**
 * Default stat card showing today's task completion
 */
export const Today: Story = {
  args: {
    icon: '✓',
    value: '3/8',
    label: 'Today',
  },
};

/**
 * Stat card showing weekly progress
 */
export const Week: Story = {
  args: {
    icon: '📅',
    value: '18/32',
    label: 'Week',
  },
};

/**
 * Stat card showing total points earned
 */
export const Points: Story = {
  args: {
    icon: '⭐',
    value: '450',
    label: 'Points',
  },
};

/**
 * Stat card showing current streak
 */
export const Streak: Story = {
  args: {
    icon: '🔥',
    value: '7',
    label: 'Day Streak',
  },
};

/**
 * Stat card with trophy icon for achievements
 */
export const Achievements: Story = {
  args: {
    icon: '🏆',
    value: '12',
    label: 'Achievements',
  },
};

/**
 * Stat card showing percentage
 */
export const Percentage: Story = {
  args: {
    icon: '📊',
    value: '87%',
    label: 'Completion Rate',
  },
};

/**
 * Multiple stat cards in a grid layout
 */
export const MultipleCards: Story = {
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; max-width: 800px;">
        <app-stat-card [icon]="'✓'" [value]="'3/8'" [label]="'Today'" />
        <app-stat-card [icon]="'📅'" [value]="'18/32'" [label]="'Week'" />
        <app-stat-card [icon]="'⭐'" [value]="'450'" [label]="'Points'" />
        <app-stat-card [icon]="'🔥'" [value]="'7'" [label]="'Day Streak'" />
        <app-stat-card [icon]="'🏆'" [value]="'12'" [label]="'Achievements'" />
        <app-stat-card [icon]="'📊'" [value]="'87%'" [label]="'Completion'" />
      </div>
    `,
  }),
};
