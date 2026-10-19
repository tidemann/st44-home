import type { Meta, StoryObj } from '@storybook/angular';
import { EmptyGroup } from './empty-group';

/**
 * EmptyGroup is rule 7's card for an empty group on desktop: the group keeps its label,
 * and this white card says what will come there. One title line, one sentence, no button.
 *
 * Part of the Diddit! Poeng look - Cards.
 */
const meta: Meta<EmptyGroup> = {
  title: 'Components/Poeng/EmptyGroup',
  component: EmptyGroup,
  tags: ['autodocs'],
  argTypes: {
    heading: {
      control: 'text',
      description: 'The title line (required)',
    },
    hint: {
      control: 'text',
      description: 'The one sentence under it (required)',
    },
    roomy: {
      control: 'boolean',
      description: "20 px inside instead of 13 / 15 px: Home's «Gjort i dag» card",
    },
  },
  decorators: [
    () => ({
      template: `<div style="max-width: 428px; padding: 16px; background: #f6f6f4;"><story /></div>`,
    }),
  ],
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
};

export default meta;
type Story = StoryObj<EmptyGroup>;

/** Oppgaver: nothing done today */
export const DoneToday: Story = {
  args: {
    heading: 'Ingen oppgaver er haket av i dag',
    hint: 'Når noen haker av en oppgave, dukker den opp her.',
    roomy: false,
  },
};

/** Ønsker (parent): no wish waiting */
export const NoneWaiting: Story = {
  args: {
    heading: 'Ingen ønsker venter på svar',
    hint: 'Når et barn ber om en belønning, kommer den her.',
    roomy: false,
  },
};

/** Belønninger (child): nothing collected yet */
export const NoneCollected: Story = {
  args: {
    heading: 'Du har ikke hentet noe ennå',
    hint: 'Det du har fått, samles her.',
    roomy: false,
  },
};

/** Home: the taller «Gjort i dag» card in the right column */
export const HomeDoneToday: Story = {
  args: {
    heading: 'Ingen oppgaver er haket av i dag',
    hint: 'Når noen haker av en oppgave, dukker den opp her.',
    roomy: true,
  },
};
