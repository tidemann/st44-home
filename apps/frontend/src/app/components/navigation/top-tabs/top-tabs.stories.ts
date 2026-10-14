import { Meta, StoryObj, applicationConfig } from '@storybook/angular';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { TopTabs, type TopTab } from './top-tabs';

const parentTabs: TopTab[] = [
  { id: 'home', icon: 'home', label: 'Hjem' },
  { id: 'tasks', icon: 'tasks', label: 'Oppgaver' },
  { id: 'family', icon: 'family', label: 'Familie' },
  { id: 'progress', icon: 'progress', label: 'Fremgang' },
  { id: 'rewards', icon: 'rewards', label: 'Belønninger' },
];

const childTabs: TopTab[] = [
  { id: 'tasks', icon: 'home', label: 'Hjem' },
  { id: 'rewards', icon: 'rewards', label: 'Belønninger' },
];

/**
 * TopTabs is the yellow top's first line from 1024 px (desktop A): the Diddit mark and
 * wordmark, the menu as tabs, the initial badge on the right. The chosen tab is the ink
 * pill. Under 1024 px it is hidden and the bottom menu takes over, so view it at 1024+.
 *
 * Part of the Diddit! Design System - Navigation Components.
 */
const meta: Meta<TopTabs> = {
  title: 'Components/Navigation/TopTabs',
  component: TopTabs,
  tags: ['autodocs'],
  decorators: [applicationConfig({ providers: [provideRouter([]), provideHttpClient()] })],
  argTypes: {
    tabs: { control: 'object', description: 'The tabs, left to right' },
    activeId: {
      control: 'select',
      options: ['home', 'tasks', 'family', 'progress', 'rewards', 'none'],
      description: "The chosen tab's id",
    },
  },
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'desktop' },
  },
};

export default meta;

type Story = StoryObj<TopTabs>;

/** The family home: Hjem chosen */
export const Home: Story = {
  args: { tabs: parentTabs, activeId: 'home' },
};

/** Oppgaver chosen */
export const Tasks: Story = {
  args: { tabs: parentTabs, activeId: 'tasks' },
};

/** Belønninger chosen: the widest tab */
export const Rewards: Story = {
  args: { tabs: parentTabs, activeId: 'rewards' },
};

/** A screen outside the menu (settings): no tab chosen */
export const NoneChosen: Story = {
  args: { tabs: parentTabs, activeId: 'none' },
};

/** A child's two screens */
export const Child: Story = {
  args: { tabs: childTabs, activeId: 'tasks' },
};
