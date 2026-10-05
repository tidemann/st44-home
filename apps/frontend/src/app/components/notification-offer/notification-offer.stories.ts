import { Meta, StoryObj } from '@storybook/angular';
import { NotificationOffer } from './notification-offer';

/**
 * Notifications offer (ST-686). After install or login, a card at the bottom asks
 * to turn on notifications; the button opens the browser's permission question
 * (browsers only ask after a tap). Shown while push is "off" on this phone, never
 * together with the install card; "Ikke nå" hides it for 14 days.
 */
const meta: Meta<NotificationOffer> = {
  title: 'Components/NotificationOffer',
  component: NotificationOffer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
  argTypes: {
    state: {
      control: 'select',
      options: ['auto', 'off', 'on', 'blocked', 'needs-install', 'server-off'],
      description: "Push state on this phone; the card shows only for 'off'",
    },
    audience: {
      control: 'select',
      options: ['auto', 'parent', 'child'],
      description: 'Who reads the card',
    },
  },
};

export default meta;
type Story = StoryObj<NotificationOffer>;

/** A parent after login: "done" messages and reminders for the children */
export const Parent: Story = {
  args: { state: 'off', audience: 'parent' },
};

/** A child after login: reminders for open chores */
export const Child: Story = {
  args: { state: 'off', audience: 'child' },
};

/** Push already on (or blocked, or not possible): nothing is shown */
export const AlreadyOn: Story = {
  args: { state: 'on', audience: 'parent' },
};
