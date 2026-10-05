import { Meta, StoryObj } from '@storybook/angular';
import { InstallPrompt } from './install-prompt';

/**
 * Install card (sketch 01). Shown at the bottom of the screen until Diddit is on
 * the home screen, or for 14 days after "Ikke nå". On iPhone it explains the two
 * steps in Safari (push reminders only work after install on iOS); on Android
 * it has an "Installer" button.
 */
const meta: Meta<InstallPrompt> = {
  title: 'Components/InstallPrompt',
  component: InstallPrompt,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
  argTypes: {
    platform: {
      control: 'select',
      options: ['auto', 'ios', 'android', null],
      description: "Which card to show; 'auto' follows the device and install state",
    },
  },
};

export default meta;
type Story = StoryObj<InstallPrompt>;

/** iPhone in Safari: two manual steps */
export const Iphone: Story = {
  args: { platform: 'ios' },
};

/** Android in Chrome: our own install button */
export const Android: Story = {
  args: { platform: 'android' },
};

/** Already installed, dismissed, or a desktop browser: nothing is shown */
export const Hidden: Story = {
  args: { platform: null },
};
