import { Meta, StoryObj, applicationConfig } from '@storybook/angular';
import { provideHttpClient } from '@angular/common/http';
import { NotificationSettings } from './notification-settings';

/**
 * Push notifications on this phone (ST-623). Parents see it on Innstillinger and
 * get "done" messages; children see the compact card on "Mine oppgaver" and get
 * "due" reminders. "Blokkert" is sketch 08: what stops working, and how to
 * switch it back on.
 */
const meta: Meta<NotificationSettings> = {
  title: 'Components/NotificationSettings',
  component: NotificationSettings,
  tags: ['autodocs'],
  decorators: [applicationConfig({ providers: [provideHttpClient()] })],
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  argTypes: {
    audience: {
      control: 'radio',
      options: ['parent', 'child'],
      description: 'Parents get "done" messages, children get "due" reminders',
    },
    compact: {
      control: 'boolean',
      description: "The child's card: shown only while there is something to do",
    },
    state: {
      control: 'select',
      options: [
        'auto',
        'checking',
        'off',
        'on',
        'blocked',
        'needs-install',
        'unsupported',
        'server-off',
        'error',
      ],
      description: "Push state on this phone; 'auto' asks the browser and the server",
    },
  },
  args: { audience: 'parent', compact: false, state: 'off' },
};

export default meta;
type Story = StoryObj<NotificationSettings>;

/** Not turned on yet: one button */
export const Off: Story = {};

/** On: turn off, or send a test */
export const On: Story = {
  args: { state: 'on' },
};

/** Sketch 08: the user said no in the browser */
export const Blocked: Story = {
  args: { state: 'blocked' },
};

/** iPhone in Safari: install first */
export const NeedsInstall: Story = {
  args: { state: 'needs-install' },
};

/** The server has no push keys yet */
export const ServerOff: Story = {
  args: { state: 'server-off' },
};

/** The server could not be reached */
export const Unreachable: Story = {
  args: { state: 'error' },
};

/** The child's card on "Mine oppgaver" */
export const ChildCard: Story = {
  args: { audience: 'child', compact: true, state: 'off' },
};

/** The child's card when blocked */
export const ChildBlocked: Story = {
  args: { audience: 'child', compact: true, state: 'blocked' },
};

/** The child's card hides once push is on */
export const ChildOnHidden: Story = {
  args: { audience: 'child', compact: true, state: 'on' },
};
