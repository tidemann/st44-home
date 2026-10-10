import type { Meta, StoryObj } from '@storybook/angular';
import { RewardCard } from './reward-card';

/**
 * RewardCard shows a reward the child can save for. Title and muted cost on
 * top; then either "Du har nok poeng" with a yellow «Spør mor», or a yellow
 * points meter with "… igjen". A reward waiting for an answer says
 * "Venter på svar"; one that is out of stock says "Tomt nå".
 *
 * Part of the Diddit! Poeng look - Reward card.
 */
const meta: Meta<RewardCard> = {
  title: 'Components/Poeng/RewardCard',
  component: RewardCard,
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'text',
      description: 'Reward name (required)',
    },
    cost: {
      control: { type: 'number', min: 0, step: 5 },
      description: 'Cost in points (required)',
    },
    balance: {
      control: { type: 'number', min: 0, step: 5 },
      description: "The child's current points",
    },
    available: {
      control: 'boolean',
      description: 'False shows "Tomt nå"',
    },
    waiting: {
      control: 'boolean',
      description: 'The ask is in flight or already waiting for an answer',
    },
    ask: {
      action: 'ask',
      description: 'Emitted when the child taps «Spør mor»',
    },
  },
  args: {
    available: true,
    waiting: false,
  },
  decorators: [
    () => ({
      template: `<div style="max-width: 342px; padding: 16px; background: #f6f6f4;"><story /></div>`,
    }),
  ],
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'button-name', enabled: true },
        ],
      },
    },
  },
};

export default meta;
type Story = StoryObj<RewardCard>;

/** Enough points: «Spør mor» is offered */
export const Affordable: Story = {
  args: {
    name: 'Kino med pappa',
    cost: 100,
    balance: 120,
  },
};

/** Exactly enough points */
export const ExactlyEnough: Story = {
  args: {
    name: 'Velge middag',
    cost: 50,
    balance: 50,
  },
};

/** Not yet: meter and how many points are left */
export const NotYet: Story = {
  args: {
    name: 'Kino med pappa',
    cost: 100,
    balance: 40,
  },
};

/** Almost there: the meter never looks full until it is */
export const AlmostThere: Story = {
  args: {
    name: 'Is på stranda',
    cost: 30,
    balance: 29,
  },
};

/** Nothing saved yet */
export const NoPoints: Story = {
  args: {
    name: 'Ny Lego-boks',
    cost: 300,
    balance: 0,
  },
};

/** Asked: waiting for a parent to answer */
export const Asked: Story = {
  args: {
    name: 'Kino med pappa',
    cost: 100,
    balance: 120,
    waiting: true,
  },
};

/** Out of stock */
export const SoldOut: Story = {
  args: {
    name: 'Ekstra skjermtid',
    cost: 20,
    balance: 60,
    available: false,
  },
};

/** A long reward name */
export const LongName: Story = {
  args: {
    name: 'Overnatting hos bestemor og bestefar på hytta i helgen',
    cost: 250,
    balance: 90,
  },
};
