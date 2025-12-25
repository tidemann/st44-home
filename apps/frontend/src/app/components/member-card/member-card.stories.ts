import { Meta, StoryObj } from '@storybook/angular';
import { MemberCard, type MemberCardData } from './member-card';

/**
 * MemberCard displays family member information with avatar, role, and optional stats.
 * Used on the Family screen to show household members.
 *
 * Part of the Diddit! Design System.
 */
const meta: Meta<MemberCard> = {
  title: 'Components/MemberCard',
  component: MemberCard,
  tags: ['autodocs'],
  argTypes: {
    member: {
      description: 'Member data to display',
    },
    showStats: {
      control: 'boolean',
      description: 'Whether to show task and points statistics',
    },
    clickable: {
      control: 'boolean',
      description: 'Whether the card is clickable',
    },
  },
};

export default meta;
type Story = StoryObj<MemberCard>;

const parentMember: MemberCardData = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah@example.com',
  role: 'parent',
  tasksCompleted: 12,
  totalTasks: 15,
  points: 450,
};

const childMember: MemberCardData = {
  id: '2',
  name: 'Alex Johnson',
  email: 'alex@example.com',
  role: 'child',
  tasksCompleted: 8,
  totalTasks: 10,
  points: 280,
};

/**
 * Parent member card with stats
 */
export const Parent: Story = {
  args: {
    member: parentMember,
    showStats: true,
    clickable: false,
  },
};

/**
 * Child member card with stats
 */
export const Child: Story = {
  args: {
    member: childMember,
    showStats: true,
    clickable: false,
  },
};

/**
 * Clickable card (for interactive use)
 */
export const Clickable: Story = {
  args: {
    member: parentMember,
    showStats: true,
    clickable: true,
  },
};

/**
 * Card without stats
 */
export const WithoutStats: Story = {
  args: {
    member: parentMember,
    showStats: false,
    clickable: false,
  },
};

/**
 * Member with zero stats
 */
export const ZeroStats: Story = {
  args: {
    member: {
      id: '3',
      name: 'New Member',
      role: 'child',
      tasksCompleted: 0,
      totalTasks: 0,
      points: 0,
    },
    showStats: true,
    clickable: false,
  },
};

/**
 * Member with single name
 */
export const SingleName: Story = {
  args: {
    member: {
      id: '4',
      name: 'Mike',
      role: 'parent',
      tasksCompleted: 5,
      totalTasks: 8,
      points: 150,
    },
    showStats: true,
    clickable: false,
  },
};

/**
 * Multiple member cards in a grid
 */
export const MultipleCards: Story = {
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1rem; max-width: 1200px;">
        <app-member-card
          [member]="{
            id: '1',
            name: 'Sarah Johnson',
            role: 'parent',
            tasksCompleted: 12,
            totalTasks: 15,
            points: 450
          }"
          [showStats]="true"
          [clickable]="true" />
        <app-member-card
          [member]="{
            id: '2',
            name: 'Alex Johnson',
            role: 'child',
            tasksCompleted: 8,
            totalTasks: 10,
            points: 280
          }"
          [showStats]="true"
          [clickable]="true" />
        <app-member-card
          [member]="{
            id: '3',
            name: 'Mike Johnson',
            role: 'parent',
            tasksCompleted: 5,
            totalTasks: 8,
            points: 150
          }"
          [showStats]="true"
          [clickable]="true" />
        <app-member-card
          [member]="{
            id: '4',
            name: 'Emma Johnson',
            role: 'child',
            tasksCompleted: 3,
            totalTasks: 5,
            points: 90
          }"
          [showStats]="true"
          [clickable]="true" />
      </div>
    `,
  }),
};
