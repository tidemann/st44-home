import { Meta, StoryObj } from '@storybook/angular';
import { SidebarNav } from './sidebar-nav';
import type { NavScreen } from '../bottom-nav/bottom-nav';

/**
 * SidebarNav provides desktop navigation with fixed sidebar.
 * Includes navigation menu and "Add Task" button.
 *
 * Part of the Diddit! Design System - Navigation Components.
 */
const meta: Meta<SidebarNav> = {
  title: 'Components/Navigation/SidebarNav',
  component: SidebarNav,
  tags: ['autodocs'],
  argTypes: {
    activeScreen: {
      control: 'select',
      options: ['home', 'tasks', 'family', 'progress'],
      description: 'Currently active screen',
    },
  },
  decorators: [
    () => ({
      template: `
        <div style="position: relative; height: 100vh; background: #f9fafb;">
          <div style="position: absolute; top: 20px; left: 300px; right: 20px; text-align: center; color: #6b7280;">
            <p>Desktop Navigation (>= 1024px)</p>
            <p style="font-size: 12px;">Visible only on larger screens</p>
          </div>
          <story />
        </div>
      `,
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

/**
 * Default state with Home active
 */
export const Home: StoryObj<SidebarNav> = {
  args: {
    activeScreen: 'home',
  },
};

/**
 * Tasks screen active
 */
export const Tasks: StoryObj<SidebarNav> = {
  args: {
    activeScreen: 'tasks',
  },
};

/**
 * Family screen active
 */
export const Family: StoryObj<SidebarNav> = {
  args: {
    activeScreen: 'family',
  },
};

/**
 * Progress screen active
 */
export const Progress: StoryObj<SidebarNav> = {
  args: {
    activeScreen: 'progress',
  },
};

/**
 * Interactive demo showing navigation and add task
 */
export const Interactive: StoryObj<SidebarNav> = {
  render: (args) => ({
    props: {
      ...args,
      currentScreen: 'home' as NavScreen,
      handleNavigate(screen: NavScreen) {
        this['currentScreen'] = screen;
        console.log('Navigated to:', screen);
      },
      handleAddTask() {
        console.log('Add Task clicked');
        alert('Add Task button clicked!');
      },
    },
    template: `
      <div style="position: relative; height: 100vh; background: #f9fafb;">
        <div style="position: absolute; top: 40px; left: 320px; right: 40px;">
          <h3 style="margin: 0 0 8px 0; color: #1f2937;">Current Screen: {{ currentScreen }}</h3>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Click navigation items or "Add Task" button</p>
          <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0 0;">Check console for event logs</p>
        </div>
        <app-sidebar-nav
          [activeScreen]="currentScreen"
          (navigate)="handleNavigate($event)"
          (addTask)="handleAddTask()" />
      </div>
    `,
  }),
};
