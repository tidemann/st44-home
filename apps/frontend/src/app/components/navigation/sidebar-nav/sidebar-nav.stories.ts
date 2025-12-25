import { Meta, StoryObj } from '@storybook/angular';
import { SidebarNav, type SidebarUser } from './sidebar-nav';
import type { NavScreen } from '../bottom-nav/bottom-nav';

/**
 * SidebarNav provides desktop navigation with fixed sidebar.
 * Includes navigation menu, "Add Task" button, and user profile section.
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
    user: {
      description: 'User information for profile section',
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

const defaultUser: SidebarUser = {
  name: 'Sarah Johnson',
  avatar: 'SJ',
  household: 'The Johnson Family',
};

/**
 * Default state with Home active
 */
export const Home: StoryObj<SidebarNav> = {
  args: {
    activeScreen: 'home',
    user: defaultUser,
  },
};

/**
 * Tasks screen active
 */
export const Tasks: StoryObj<SidebarNav> = {
  args: {
    activeScreen: 'tasks',
    user: defaultUser,
  },
};

/**
 * Family screen active
 */
export const Family: StoryObj<SidebarNav> = {
  args: {
    activeScreen: 'family',
    user: defaultUser,
  },
};

/**
 * Progress screen active
 */
export const Progress: StoryObj<SidebarNav> = {
  args: {
    activeScreen: 'progress',
    user: defaultUser,
  },
};

/**
 * User with single name
 */
export const SingleNameUser: StoryObj<SidebarNav> = {
  args: {
    activeScreen: 'home',
    user: {
      name: 'Mike',
      avatar: 'MI',
      household: 'The Smith Family',
    },
  },
};

/**
 * User with long household name
 */
export const LongHouseholdName: StoryObj<SidebarNav> = {
  args: {
    activeScreen: 'home',
    user: {
      name: 'Alexandra Martinez',
      avatar: 'AM',
      household: 'The Martinez-Rodriguez Family Household',
    },
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
      user: defaultUser,
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
          [user]="user"
          (navigate)="handleNavigate($event)"
          (addTask)="handleAddTask()" />
      </div>
    `,
  }),
};
