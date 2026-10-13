import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { ChoreRow } from './chore-row';
import { GroupLabel } from '../group-label/group-label';

/**
 * ChoreRow is the white 68 px chore card: checkbox, title over a who-and-when
 * line, then either the points in amber ink or a projected row action
 * (`[row-action]`, e.g. «Ferdig»). Overdue rows keep the white fill and get a
 * 2 px rust border; done rows show a green tick and say when ("Gjort 16.10").
 *
 * Part of the Diddit! Poeng look - Cards and rows.
 */
const meta: Meta<ChoreRow> = {
  title: 'Components/Poeng/ChoreRow',
  component: ChoreRow,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Chore title (required)',
    },
    meta: {
      control: 'text',
      description: 'Who and when, e.g. "Mathea – I dag"',
    },
    overdue: {
      control: 'boolean',
      description: 'Rust border and rust meta line',
    },
    done: {
      control: 'boolean',
      description: 'Green tick instead of the empty box',
    },
    points: {
      control: 'text',
      description: 'Right-hand points text, e.g. "5 p" or "+10". Empty hides it',
    },
    checkable: {
      control: 'boolean',
      description: 'The checkbox is a real control that completes the chore',
    },
    busy: {
      control: 'boolean',
      description: 'The checkbox is busy (request in flight)',
    },
    openable: {
      control: 'boolean',
      description: 'The title area is a button that opens the chore',
    },
    note: {
      control: 'object',
      description: 'Line under the row, e.g. { text: "Påminnelse sendt 16.49", tone: "done" }',
    },
    check: {
      action: 'check',
      description: 'Emitted when the checkbox is ticked',
    },
    open: {
      action: 'open',
      description: 'Emitted when the title area is tapped',
    },
  },
  args: {
    meta: '',
    overdue: false,
    done: false,
    points: '',
    checkable: false,
    busy: false,
    openable: false,
    note: null,
  },
  decorators: [
    moduleMetadata({ imports: [GroupLabel] }),
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
type Story = StoryObj<ChoreRow>;

/** Open chore, nothing ticked yet */
export const Open: Story = {
  args: {
    title: 'Rydde rommet',
    meta: 'Mathea – I dag',
  },
};

/** Open chore with its points on the right */
export const WithPoints: Story = {
  args: {
    title: 'Ta ut søpla',
    meta: 'Mathea – I dag',
    points: '5 p',
  },
};

/** Checkable: the box is a real button that completes the chore */
export const Checkable: Story = {
  args: {
    title: 'Ta ut søpla',
    meta: 'Mathea – I dag',
    points: '5 p',
    checkable: true,
  },
};

/** Checkable while the request is in flight */
export const Busy: Story = {
  args: {
    title: 'Ta ut søpla',
    meta: 'Mathea – I dag',
    points: '5 p',
    checkable: true,
    busy: true,
  },
};

/** Long title: wraps to at most 2 lines, then «…»; only then is the row taller than 68 px */
export const LongTitle: Story = {
  args: {
    title: 'Ta ut av oppvaskmaskinen og sett alt inn i skapet over vasken før middag',
    meta: 'Mathea – I dag',
    points: '5 p',
    checkable: true,
  },
};

/** Overdue: rust border and rust meta line */
export const Overdue: Story = {
  args: {
    title: 'Støvsuge stua',
    meta: 'Jonas – I går',
    points: '10 p',
    overdue: true,
  },
};

/** Done: green tick and when it was done */
export const Done: Story = {
  args: {
    title: 'Mate katten',
    meta: 'Gjort 16.10',
    points: '+10',
    done: true,
  },
};

/** Parent view: the title opens the chore for editing */
export const Openable: Story = {
  args: {
    title: 'Vaske opp',
    meta: 'Alle barn – Hver dag',
    points: '5 p',
    openable: true,
  },
};

/** A very long title wraps to 2 lines, then «…» */
export const LongTitleCut: Story = {
  args: {
    title: 'Rydde rommet, re opp senga og legge klærne i skittentøyskurven',
    meta: 'Mathea – I dag',
    points: '15 p',
  },
};

/** Child view: a projected «Ferdig» action instead of points */
export const WithRowAction: Story = {
  render: (args) => ({
    props: args,
    template: `
      <app-chore-row [title]="title" [meta]="meta" [overdue]="overdue">
        <button
          row-action
          type="button"
          [attr.aria-label]="'Merk som ferdig: ' + title"
          style="height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: var(--yellow); color: var(--ink); font-weight: 700;"
        >
          Ferdig
        </button>
      </app-chore-row>
    `,
  }),
  args: {
    title: 'Rydde rommet',
    meta: 'Mathea – I dag',
  },
};

/** «Minn på» went out (ST-1066 C): thumbs up + «Sendt», and the time stays in the row */
export const ReminderSent: Story = {
  render: (args) => ({
    props: args,
    template: `
      <app-chore-row [title]="title" [meta]="meta" [overdue]="true" [note]="note">
        <button row-action type="button" class="rbtn" disabled style="gap: 8px; padding: 0 12px; opacity: 1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg>
          Sendt
        </button>
      </app-chore-row>
    `,
  }),
  args: {
    title: 'Rydde rommet',
    meta: 'Jonas – I går',
    note: { text: 'Påminnelse sendt 16.49', tone: 'done' },
  },
};

/** «Minn på» did not go out: «Prøv igjen» and a rust line with a warning sign */
export const ReminderFailed: Story = {
  render: (args) => ({
    props: args,
    template: `
      <app-chore-row [title]="title" [meta]="meta" [overdue]="true" [note]="note">
        <button row-action type="button" class="rbtn">Prøv igjen</button>
      </app-chore-row>
    `,
  }),
  args: {
    title: 'Rydde rommet',
    meta: 'Jonas – I går',
    note: { text: 'Påminnelsen gikk ikke gjennom', tone: 'overdue' },
  },
};

/** A child's day: overdue, open and done groups together */
export const ChildDay: Story = {
  render: () => ({
    template: `
      <app-group-label label="Forfalt" [overdue]="true" />
      <app-chore-row title="Støvsuge stua" meta="I går" points="10 p" [overdue]="true" />
      <app-group-label label="I dag" right="2 igjen" />
      <app-chore-row title="Rydde rommet" meta="I dag" points="10 p" />
      <app-chore-row title="Ta ut søpla" meta="I dag" points="5 p" />
      <app-group-label label="Gjort i dag" />
      <app-chore-row title="Mate katten" meta="Gjort 07.45" points="+5" [done]="true" />
    `,
  }),
};
