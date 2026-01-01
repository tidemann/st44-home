import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CreateTaskModal } from './create-task-modal';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import type { Child } from '@st44/types';

/**
 * CreateTaskModal Component
 *
 * Full-featured task creation modal supporting all 4 task types:
 * - Daily: Tasks assigned every day
 * - Repeating: Tasks on specific days of the week
 * - Weekly Rotation: Tasks that rotate between children
 * - Single: One-time tasks with optional deadline and candidates
 *
 * ## Features
 * - Form validation with error messages
 * - Day selection for repeating tasks
 * - Child selection for rotation and single tasks
 * - Deadline picker for single tasks
 * - Points configuration (1-1000)
 * - Loading state during submission
 * - Error handling and display
 *
 * ## Accessibility
 * - All form inputs have labels
 * - Keyboard navigation support
 * - Focus trap within modal
 * - ARIA attributes for screen readers
 */
const meta: Meta<CreateTaskModal> = {
  title: 'Components/Modals/CreateTaskModal',
  component: CreateTaskModal,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [ReactiveFormsModule],
    }),
  ],
  argTypes: {
    open: {
      description: 'Whether the modal is open',
      control: 'boolean',
    },
    householdId: {
      description: 'The household ID for task creation',
      control: 'text',
    },
    children: {
      description: 'List of children for assignment options',
      control: 'object',
    },
    closeRequested: {
      description: 'Event emitted when modal should close',
      action: 'closeRequested',
    },
    taskCreated: {
      description: 'Event emitted when task is successfully created',
      action: 'taskCreated',
    },
  },
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#F8F9FF' },
        { name: 'white', value: '#FFFFFF' },
      ],
    },
  },
};

export default meta;
type Story = StoryObj<CreateTaskModal>;

// Sample children data
const sampleChildren: Child[] = [
  {
    id: 'child-1',
    householdId: 'household-1',
    name: 'Emma',
    birthYear: 2015,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'child-2',
    householdId: 'household-1',
    name: 'Noah',
    birthYear: 2017,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'child-3',
    householdId: 'household-1',
    name: 'Olivia',
    birthYear: 2013,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const manyChildren: Child[] = [
  ...sampleChildren,
  {
    id: 'child-4',
    householdId: 'household-1',
    name: 'Liam',
    birthYear: 2014,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'child-5',
    householdId: 'household-1',
    name: 'Sophia',
    birthYear: 2016,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'child-6',
    householdId: 'household-1',
    name: 'James',
    birthYear: 2018,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const singleChild: Child[] = [sampleChildren[0]];

/**
 * Default State
 *
 * The modal in its default state with daily task type selected.
 * Shows basic form fields: name, description, points.
 */
export const Default: Story = {
  args: {
    open: true,
    householdId: '123e4567-e89b-12d3-a456-426614174000',
    children: sampleChildren,
  },
};

/**
 * Daily Task
 *
 * Default task type - assigned every day to all children.
 * Simplest form with just name, description, and points.
 */
export const DailyTask: Story = {
  name: 'Daily Task (Default)',
  args: {
    open: true,
    householdId: '123e4567-e89b-12d3-a456-426614174000',
    children: sampleChildren,
  },
};

/**
 * Closed Modal
 *
 * Shows the modal in closed state (not visible).
 * Useful for testing open/close transitions.
 */
export const Closed: Story = {
  args: {
    open: false,
    householdId: '123e4567-e89b-12d3-a456-426614174000',
    children: sampleChildren,
  },
};

/**
 * No Children Available
 *
 * Edge case: household has no children.
 * Some task types (rotation, single) require children selection,
 * which should show appropriate messaging.
 */
export const NoChildren: Story = {
  args: {
    open: true,
    householdId: '123e4567-e89b-12d3-a456-426614174000',
    children: [],
  },
};

/**
 * Single Child
 *
 * Edge case: household has only one child.
 * Weekly rotation requires at least 2 children.
 */
export const SingleChild: Story = {
  args: {
    open: true,
    householdId: '123e4567-e89b-12d3-a456-426614174000',
    children: singleChild,
  },
};

/**
 * Many Children
 *
 * Edge case: household has 6+ children.
 * Tests layout with many selection options.
 */
export const ManyChildren: Story = {
  args: {
    open: true,
    householdId: '123e4567-e89b-12d3-a456-426614174000',
    children: manyChildren,
  },
};

/**
 * Mobile View
 *
 * Shows how the modal adapts to mobile viewport.
 * Should be full-width and easily tappable.
 */
export const Mobile: Story = {
  args: {
    open: true,
    householdId: '123e4567-e89b-12d3-a456-426614174000',
    children: sampleChildren,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

/**
 * Tablet View
 *
 * Shows how the modal adapts to tablet viewport.
 */
export const Tablet: Story = {
  args: {
    open: true,
    householdId: '123e4567-e89b-12d3-a456-426614174000',
    children: sampleChildren,
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

/**
 * Accessibility Testing
 *
 * Story for testing accessibility with the a11y addon.
 * Verifies color contrast, button names, and ARIA attributes.
 */
export const Accessibility: Story = {
  args: {
    open: true,
    householdId: '123e4567-e89b-12d3-a456-426614174000',
    children: sampleChildren,
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'button-name', enabled: true },
          { id: 'form-field-multiple-labels', enabled: true },
          { id: 'label', enabled: true },
        ],
      },
    },
  },
};

/**
 * Dark Mode
 *
 * Shows the modal with dark background for contrast testing.
 */
export const DarkBackground: Story = {
  args: {
    open: true,
    householdId: '123e4567-e89b-12d3-a456-426614174000',
    children: sampleChildren,
  },
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#1a1a2e' }],
    },
  },
};
