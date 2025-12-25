import { Meta, StoryObj } from '@storybook/angular';
import { BottomNav, type NavScreen } from './bottom-nav';

/**
 * BottomNav provides mobile/tablet navigation with fixed bottom bar.
 * Displays 4 main navigation items with icons and labels.
 *
 * Part of the Diddit! Design System - Navigation Components.
 */
const meta: Meta<BottomNav> = {
  title: 'Components/Navigation/BottomNav',
  component: BottomNav,
  tags: ['autodocs'],
  argTypes: {
    activeScreen: {
      control: 'select',
      options: ['home', 'tasks', 'family', 'progress'],
      description: 'Currently active screen',
    },
  },
  decorators: [
    (Story) => ({
      template: `
        <div style="position: relative; height: 400px; background: #f9fafb; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px; color: #6b7280;">
            <p>Mobile/Tablet Navigation (< 1024px)</p>
            <p style="font-size: 12px;">Visible only on smaller screens</p>
          </div>
          <story />
        </div>
      `,
    }),
  ],
};

export default meta;

/**
 * Default state with Home active
 */
export const Home: StoryObj<BottomNav> = {
  args: {
    activeScreen: 'home',
  },
};

/**
 * Tasks screen active
 */
export const Tasks: StoryObj<BottomNav> = {
  args: {
    activeScreen: 'tasks',
  },
};

/**
 * Family screen active
 */
export const Family: StoryObj<BottomNav> = {
  args: {
    activeScreen: 'family',
  },
};

/**
 * Progress screen active
 */
export const Progress: StoryObj<BottomNav> = {
  args: {
    activeScreen: 'progress',
  },
};

/**
 * Interactive demo showing navigation between screens
 */
export const Interactive: StoryObj<BottomNav> = {
  render: (args) => ({
    props: {
      ...args,
      currentScreen: 'home' as NavScreen,
      handleNavigate(screen: NavScreen) {
        this['currentScreen'] = screen;
        console.log('Navigated to:', screen);
      },
    },
    template: `
      <div style="position: relative; height: 400px; background: #f9fafb; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="margin: 0; color: #1f2937;">Current Screen: {{ currentScreen }}</h3>
          <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Click navigation items to switch screens</p>
        </div>
        <app-bottom-nav
          [activeScreen]="currentScreen"
          (navigate)="handleNavigate($event)" />
      </div>
    `,
  }),
};
