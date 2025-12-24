import type { Meta, StoryObj } from '@storybook/angular';
import { fn } from '@storybook/test';
import { TaskCardComponent } from './task-card.component';
import type { Assignment } from '@st44/types';

/**
 * TaskCard Component
 *
 * Displays a task assignment card with title, description, status, and completion action.
 * Used in both child and parent task views.
 *
 * ## Features
 * - Shows task title and optional description
 * - Displays status badges (completed, overdue)
 * - Mark complete button with accessibility labels
 * - Responsive layout (stacks on mobile)
 * - Visual states for completed and overdue tasks
 *
 * ## Accessibility
 * - ARIA labels on all interactive elements
 * - Keyboard navigation support
 * - 44px minimum touch targets for mobile
 * - Clear focus indicators
 */
const meta: Meta<TaskCardComponent> = {
  title: 'Components/Cards/TaskCard',
  component: TaskCardComponent,
  tags: ['autodocs'],
  argTypes: {
    task: {
      description: 'Task assignment to display',
      control: 'object',
    },
    complete: {
      description: 'Event emitted when user clicks "Mark Complete" button',
      action: 'complete',
    },
  },
  args: {
    // Setup action spy for all stories
    complete: fn(),
  },
};

export default meta;
type Story = StoryObj<TaskCardComponent>;

// Sample task data
const pendingTask: Assignment = {
  id: '1',
  taskId: 'task-1',
  userId: 'child-1',
  title: 'Clean bathroom',
  description: 'Clean the bathroom including toilet, sink, and shower',
  points: 10,
  date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const completedTask: Assignment = {
  ...pendingTask,
  id: '2',
  title: 'Take out trash',
  description: 'Take all trash bins to the curb',
  status: 'completed',
};

const overdueTask: Assignment = {
  ...pendingTask,
  id: '3',
  title: 'Do homework',
  description: 'Complete math homework pages 12-15',
  date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
  status: 'pending',
};

const taskWithoutDescription: Assignment = {
  ...pendingTask,
  id: '4',
  title: 'Make bed',
  description: '',
};

const longTextTask: Assignment = {
  ...pendingTask,
  id: '5',
  title: 'Clean the entire garage including organizing tools and equipment',
  description:
    'This is a very long description that should test how the component handles long text. It includes multiple sentences and should demonstrate text wrapping and layout behavior with extended content.',
};

/**
 * Default pending task
 *
 * Shows a task that is not yet completed with a "Mark Complete" button.
 */
export const Default: Story = {
  args: {
    task: pendingTask,
  },
};

/**
 * Completed task
 *
 * Shows a completed task with green background and checkmark badge.
 * Title is crossed out, button is replaced with "Done" badge.
 */
export const Completed: Story = {
  args: {
    task: completedTask,
  },
};

/**
 * Overdue task
 *
 * Shows a pending task that is past its due date with red border and warning badge.
 */
export const Overdue: Story = {
  args: {
    task: overdueTask,
  },
};

/**
 * Task without description
 *
 * Shows how the component handles tasks with no description.
 */
export const WithoutDescription: Story = {
  args: {
    task: taskWithoutDescription,
  },
};

/**
 * Long text task
 *
 * Tests how the component handles very long titles and descriptions.
 */
export const LongText: Story = {
  args: {
    task: longTextTask,
  },
};

/**
 * Mobile view
 *
 * Shows how the component stacks vertically on mobile devices.
 */
export const Mobile: Story = {
  args: {
    task: pendingTask,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};

/**
 * All states comparison
 *
 * Shows all task states side by side for comparison.
 */
export const AllStates: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display: grid; gap: 1rem; max-width: 800px;">
        <app-task-card [task]="pendingTask" (complete)="complete($event)"></app-task-card>
        <app-task-card [task]="completedTask" (complete)="complete($event)"></app-task-card>
        <app-task-card [task]="overdueTask" (complete)="complete($event)"></app-task-card>
      </div>
    `,
  }),
  args: {
    pendingTask,
    completedTask,
    overdueTask,
  },
};

/**
 * Interactive example
 *
 * Demonstrates the click interaction and event emission.
 * Click the "Mark Complete" button to see the action in the Actions panel.
 */
export const Interactive: Story = {
  args: {
    task: pendingTask,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Click the "Mark Complete" button to trigger the `complete` event. Check the Actions panel below to see the emitted event.',
      },
    },
  },
};

/**
 * Accessibility testing
 *
 * This story demonstrates accessibility features and is tested with the a11y addon.
 */
export const Accessibility: Story = {
  args: {
    task: pendingTask,
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'button-name',
            enabled: true,
          },
          {
            id: 'aria-allowed-attr',
            enabled: true,
          },
        ],
      },
    },
  },
};

/**
 * List of tasks
 *
 * Shows how multiple TaskCards look together in a list.
 */
export const TaskList: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 800px; background: #F8F9FF; padding: 1.5rem; border-radius: 8px;">
        <h2 style="margin-top: 0; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 600;">My Tasks</h2>
        <app-task-card [task]="task1" (complete)="complete($event)"></app-task-card>
        <app-task-card [task]="task2" (complete)="complete($event)"></app-task-card>
        <app-task-card [task]="task3" (complete)="complete($event)"></app-task-card>
        <app-task-card [task]="task4" (complete)="complete($event)"></app-task-card>
      </div>
    `,
  }),
  args: {
    task1: pendingTask,
    task2: overdueTask,
    task3: completedTask,
    task4: taskWithoutDescription,
  },
};
