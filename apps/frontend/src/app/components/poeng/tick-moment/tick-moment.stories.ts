import type { Meta, StoryObj } from '@storybook/angular';
import { TickMoment, type TickGoal, type TickNext } from './tick-moment';

const kino: TickGoal = { name: 'Kino med pappa', cost: 100, balance: 60 };
const nextChore: TickNext = { title: 'Ta ut søpla', meta: 'I dag', points: 5 };

/**
 * TickMoment is the signature tick-off moment: yellow edge to edge, no nav.
 * Ink badge, the chore, "Haket av 16.48", a huge «+10 poeng», the praise, the
 * ink meter towards the goal, the next chore on a darker inset, and «Angre»
 * offered at the same size as «Ferdig». It stays until the child presses
 * «Ferdig» (or Escape); «Angre» disappears after 5 minutes.
 *
 * The component is `position: fixed` and fills the viewport, so each story is
 * rendered in its own iframe in the docs page.
 *
 * Part of the Diddit! Poeng look - The tick-off moment.
 */
const meta: Meta<TickMoment> = {
  title: 'Components/Poeng/TickMoment',
  component: TickMoment,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'The chore that was ticked (required)',
    },
    doneAt: {
      control: 'text',
      description: 'Clock time it was ticked, e.g. "16.48" (required)',
    },
    points: {
      control: { type: 'number', min: 0, step: 5 },
      description: 'Points awarded (required)',
    },
    childName: {
      control: 'text',
      description: 'Used in the praise ("Bra jobba, Mathea"). Empty gives "Bra jobba"',
    },
    goal: {
      control: 'object',
      description: 'The reward the child is saving for; balance is after this chore',
    },
    next: {
      control: 'object',
      description: 'The next open chore, shown on the darker inset',
    },
    undoBusy: {
      control: 'boolean',
      description: 'Undo request in flight (disables both buttons)',
    },
    undoError: {
      control: 'text',
      description: 'Why the undo did not go through, in words a child understands',
    },
    undo: {
      action: 'undo',
      description: 'Emitted when «Angre» is pressed',
    },
    closed: {
      action: 'closed',
      description: 'Emitted on «Ferdig» or Escape',
    },
  },
  args: {
    childName: '',
    goal: null,
    next: null,
    undoBusy: false,
    undoError: null,
  },
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile' },
    docs: {
      story: { inline: false, iframeHeight: 780 },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'aria-dialog-name', enabled: true },
          { id: 'button-name', enabled: true },
        ],
      },
    },
  },
};

export default meta;
type Story = StoryObj<TickMoment>;

/** +10 shown, with the goal meter and the next chore */
export const PlusTen: Story = {
  args: {
    title: 'Rydde rommet',
    doneAt: '16.48',
    points: 10,
    childName: 'Mathea',
    goal: kino,
    next: nextChore,
  },
};

/** Just the award: no goal and no next chore */
export const Minimal: Story = {
  args: {
    title: 'Ta ut søpla',
    doneAt: '18.05',
    points: 5,
  },
};

/** This chore reached the goal: "Nok poeng!" */
export const GoalReached: Story = {
  args: {
    title: 'Støvsuge stua',
    doneAt: '17.20',
    points: 15,
    childName: 'Jonas',
    goal: { name: 'Kino med pappa', cost: 100, balance: 105 },
    next: null,
  },
};

/** Last chore of the day: goal shown, nothing next */
export const LastChoreToday: Story = {
  args: {
    title: 'Mate katten',
    doneAt: '19.30',
    points: 5,
    childName: 'Emil',
    goal: { name: 'Is på stranda', cost: 30, balance: 20 },
    next: null,
  },
};

/** Undo request in flight */
export const UndoBusy: Story = {
  args: {
    title: 'Rydde rommet',
    doneAt: '16.48',
    points: 10,
    childName: 'Mathea',
    goal: kino,
    next: nextChore,
    undoBusy: true,
  },
};

/** Undo failed, explained in plain words */
export const UndoError: Story = {
  args: {
    title: 'Rydde rommet',
    doneAt: '16.48',
    points: 10,
    childName: 'Mathea',
    goal: kino,
    next: nextChore,
    undoError: 'Det gikk ikke å angre nå. Prøv igjen om litt.',
  },
};
