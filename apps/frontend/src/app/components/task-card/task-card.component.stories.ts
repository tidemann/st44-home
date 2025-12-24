import type { Meta, StoryObj } from '@storybook/angular';
import { TaskCardComponent } from './task-card.component';
import type { AssignmentWithPoints, Task } from '@st44/types';

/**
 * TaskCard Component
 *
 * Displays task templates or task assignments with interactive completion and edit actions.
 * Supports both Task templates (with points, recurrence) and Assignment instances (with status, dates).
 *
 * ## Features
 * - Shows task name/title and metadata (recurrence or status)
 * - Displays points badge for tasks with point values
 * - Mark complete button with gradient styling
 * - Click to edit functionality with keyboard support
 * - Responsive layout (optimized for mobile)
 * - Visual states for completed and overdue tasks
 *
 * ## Accessibility
 * - ARIA labels on all interactive elements
 * - Keyboard navigation support (Tab, Enter, Space)
 * - Clear focus indicators
 * - Sufficient color contrast (WCAG 2.1 AA)
 */
const meta: Meta<TaskCardComponent> = {
  title: 'Components/Cards/TaskCard',
  component: TaskCardComponent,
  tags: ['autodocs'],
  argTypes: {
    task: {
      description: 'Task template or assignment to display',
      control: 'object',
    },
    showCompleteButton: {
      description: 'Whether to show the complete button',
      control: 'boolean',
    },
    clickable: {
      description: 'Whether the card is clickable for editing',
      control: 'boolean',
    },
    complete: {
      description: 'Event emitted when user clicks complete button',
      action: 'complete',
    },
    edit: {
      description: 'Event emitted when user clicks card to edit',
      action: 'edit',
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
type Story = StoryObj<TaskCardComponent>;

// Sample task data
const pendingTask: AssignmentWithPoints = {
  id: '1',
  taskId: 'task-1',
  childId: 'child-1',
  childName: 'Alex',
  title: 'Clean bathroom',
  description: 'Clean the bathroom including toilet, sink, and shower',
  ruleType: 'daily',
  points: 10,
  date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow (date only)
  status: 'pending',
  completedAt: null,
  createdAt: new Date().toISOString(),
};

const completedTask: AssignmentWithPoints = {
  ...pendingTask,
  id: '2',
  title: 'Take out trash',
  description: 'Take all trash bins to the curb',
  status: 'completed',
  completedAt: new Date().toISOString(),
};

const overdueTask: AssignmentWithPoints = {
  ...pendingTask,
  id: '3',
  title: 'Do homework',
  description: 'Complete math homework pages 12-15',
  date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday (date only)
  status: 'pending',
};

const taskWithoutDescription: AssignmentWithPoints = {
  ...pendingTask,
  id: '4',
  title: 'Make bed',
  description: null,
};

const longTextTask: AssignmentWithPoints = {
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
  render: () => ({
    props: { pendingTask, completedTask, overdueTask },
    template: `
      <div style="display: grid; gap: 1rem; max-width: 800px;">
        <app-task-card [task]="pendingTask"></app-task-card>
        <app-task-card [task]="completedTask"></app-task-card>
        <app-task-card [task]="overdueTask"></app-task-card>
      </div>
    `,
  }),
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
    showCompleteButton: true,
    clickable: true,
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
 * List of assignments
 *
 * Shows how multiple assignment TaskCards look together in a list.
 */
export const TaskList: Story = {
  render: () => ({
    props: {
      task1: pendingTask,
      task2: overdueTask,
      task3: completedTask,
      task4: taskWithoutDescription,
    },
    template: `
      <div style="max-width: 800px; background: #F8F9FF; padding: 1.5rem; border-radius: 8px;">
        <h2 style="margin-top: 0; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 600;">My Tasks</h2>
        <app-task-card [task]="task1"></app-task-card>
        <app-task-card [task]="task2"></app-task-card>
        <app-task-card [task]="task3"></app-task-card>
        <app-task-card [task]="task4"></app-task-card>
      </div>
    `,
  }),
};

// === TASK TEMPLATE STORIES ===

const dailyTask: Task = {
  id: 'task-1',
  householdId: 'household-1',
  name: 'Clean the kitchen',
  description: 'Wash dishes, wipe counters, sweep floor',
  points: 50,
  ruleType: 'daily',
  ruleConfig: null,
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const weeklyRotationTask: Task = {
  id: 'task-2',
  householdId: 'household-1',
  name: 'Take out the trash',
  description: null,
  points: 25,
  ruleType: 'weekly_rotation',
  ruleConfig: {
    rotationType: 'odd_even_week',
    repeatDays: undefined,
    assignedChildren: ['child-1', 'child-2'],
  },
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const repeatingTask: Task = {
  id: 'task-3',
  householdId: 'household-1',
  name: 'Water the plants',
  description: null,
  points: 15,
  ruleType: 'repeating',
  ruleConfig: {
    rotationType: undefined,
    repeatDays: [1, 3, 5],
    assignedChildren: undefined,
  },
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const highPointTask: Task = {
  ...dailyTask,
  id: 'task-4',
  name: 'Deep clean the bathroom',
  points: 100,
};

const lowPointTask: Task = {
  ...dailyTask,
  id: 'task-5',
  name: 'Make your bed',
  points: 5,
};

/**
 * Task Template - Daily
 *
 * Shows a task template with daily recurrence and 50 points.
 */
export const TaskTemplateDaily: Story = {
  args: {
    task: dailyTask,
    showCompleteButton: true,
    clickable: true,
  },
};

/**
 * Task Template - Weekly Rotation
 *
 * Shows a task template with weekly rotation rule.
 */
export const TaskTemplateWeeklyRotation: Story = {
  args: {
    task: weeklyRotationTask,
    showCompleteButton: true,
    clickable: true,
  },
};

/**
 * Task Template - Repeating
 *
 * Shows a task template with repeating days rule.
 */
export const TaskTemplateRepeating: Story = {
  args: {
    task: repeatingTask,
    showCompleteButton: true,
    clickable: true,
  },
};

/**
 * Task Template - High Points
 *
 * Shows a task template with high point value (100).
 */
export const TaskTemplateHighPoints: Story = {
  args: {
    task: highPointTask,
    showCompleteButton: true,
    clickable: true,
  },
};

/**
 * Task Template - Low Points
 *
 * Shows a task template with low point value (5).
 */
export const TaskTemplateLowPoints: Story = {
  args: {
    task: lowPointTask,
    showCompleteButton: true,
    clickable: true,
  },
};

/**
 * Task Template - Not Clickable
 *
 * Shows a task template that is not clickable for editing.
 */
export const TaskTemplateNotClickable: Story = {
  args: {
    task: dailyTask,
    showCompleteButton: true,
    clickable: false,
  },
};

/**
 * Task Template - No Complete Button
 *
 * Shows a task template without the complete button.
 */
export const TaskTemplateNoCompleteButton: Story = {
  args: {
    task: dailyTask,
    showCompleteButton: false,
    clickable: true,
  },
};

/**
 * Mixed Task Types
 *
 * Shows both task templates and assignments together.
 */
export const MixedTaskTypes: Story = {
  render: () => ({
    props: {
      taskTemplate: dailyTask,
      assignment: pendingTask,
      completedAssignment: completedTask,
    },
    template: `
      <div style="max-width: 800px; background: #F8F9FF; padding: 1.5rem; border-radius: 8px;">
        <h2 style="font-family: var(--font-heading, 'Fredoka', sans-serif); margin-top: 0; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 600;">Task Templates</h2>
        <app-task-card [task]="taskTemplate" [showCompleteButton]="false" [clickable]="true"></app-task-card>

        <h2 style="font-family: var(--font-heading, 'Fredoka', sans-serif); margin-top: 2rem; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 600;">My Assignments</h2>
        <app-task-card [task]="assignment" [showCompleteButton]="true" [clickable]="true"></app-task-card>
        <app-task-card [task]="completedAssignment" [showCompleteButton]="true" [clickable]="true"></app-task-card>
      </div>
    `,
  }),
};
