import { Meta, StoryObj } from '@storybook/angular';
import { OfflineBanner } from './offline-banner';

/**
 * "No network" strip (sketch 08). The page keeps the last data; the strip tells
 * how old it is and that changes wait for the network.
 */
const meta: Meta<OfflineBanner> = {
  title: 'Components/OfflineBanner',
  component: OfflineBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    offline: {
      control: 'select',
      options: ['auto', true, false],
      description: "Force the strip on or off; 'auto' follows the network",
    },
    lastSyncAt: {
      control: 'number',
      description: "Time (ms) of the last data from the network; 'auto' reads it from the app",
    },
  },
};

export default meta;
type Story = StoryObj<OfflineBanner>;

/** Offline, with data from 16:02 */
export const Offline: Story = {
  args: { offline: true, lastSyncAt: new Date(2026, 9, 5, 16, 2).getTime() },
};

/** Offline before the app ever had data */
export const OfflineNoData: Story = {
  args: { offline: true, lastSyncAt: null },
};

/** Online: nothing is shown */
export const Online: Story = {
  args: { offline: false },
};
