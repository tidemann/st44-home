import type { Meta, StoryObj } from '@storybook/angular';

/**
 * Diddit colours: Poeng, light mode.
 * Spec: docs/design/diddit/DESIGN-GUIDE.md (Colors). One yellow, warm-neutral greys,
 * three small semantic colours. Anything on the yellow is ink.
 */
const meta: Meta = {
  title: 'Design System/Colors',
  tags: ['autodocs'],
};

export default meta;

interface Swatch {
  token: string;
  hex: string;
  name: string;
  use: string;
  /** Colour of the sample label drawn on the swatch */
  on: string;
}

const groups: { title: string; swatches: Swatch[] }[] = [
  {
    title: 'Primary and secondary',
    swatches: [
      {
        token: '--yellow',
        hex: '#F6B93B',
        name: 'Diddit Yellow',
        use: 'Buttons, row actions, points meters, the tick-off screen. Never text.',
        on: 'var(--ink)',
      },
      {
        token: '--ink',
        hex: '#17120A',
        name: 'Ink',
        use: 'Everything on the yellow (10.57:1).',
        on: '#ffffff',
      },
      {
        token: '--amber-ink',
        hex: '#8A5A00',
        name: 'Amber Ink',
        use: 'Points on white (5.93:1). Never on the yellow.',
        on: '#ffffff',
      },
    ],
  },
  {
    title: 'Semantic',
    swatches: [
      {
        token: '--overdue',
        hex: '#A43A16',
        name: 'Overdue Rust',
        use: '"Forfalt", the 2px overdue border (6.57:1).',
        on: '#ffffff',
      },
      {
        token: '--done',
        hex: '#0F7A54',
        name: 'Done Green',
        use: 'Done ticks and the chore meter (5.34:1).',
        on: '#ffffff',
      },
    ],
  },
  {
    title: 'Neutral',
    swatches: [
      {
        token: '--text',
        hex: '#15181C',
        name: 'Text',
        use: 'Headings, titles, numerals (17.81:1).',
        on: '#ffffff',
      },
      {
        token: '--text-muted',
        hex: '#555E64',
        name: 'Muted Text',
        use: 'Dates, meta, inactive labels (6.62:1).',
        on: '#ffffff',
      },
      {
        token: '--surface',
        hex: '#FFFFFF',
        name: 'Surface',
        use: 'Cards.',
        on: 'var(--text)',
      },
      {
        token: '--bg',
        hex: '#F6F6F4',
        name: 'Background',
        use: 'The screen behind the cards.',
        on: 'var(--text)',
      },
      {
        token: '--track',
        hex: '#ECECE8',
        name: 'Track',
        use: 'Unfilled meter segments, the initial badge.',
        on: 'var(--text)',
      },
      {
        token: '--hairline',
        hex: '#DFDFD9',
        name: 'Hairline',
        use: 'Structural dividers only. Carries no state.',
        on: 'var(--text)',
      },
    ],
  },
  {
    title: 'On the yellow',
    swatches: [
      {
        token: '--yellow-inset',
        hex: '#DBA434',
        name: 'Yellow Inset',
        use: 'The inset card on the yellow screen (ink 8.31:1).',
        on: 'var(--ink)',
      },
      {
        token: '--yellow-track',
        hex: '#C59430',
        name: 'Yellow Track',
        use: 'Unfilled meter segments on the yellow.',
        on: 'var(--ink)',
      },
    ],
  },
];

export const Palette: StoryObj = {
  render: () => ({
    props: { groups },
    template: `
      <div style="font-family: var(--font-text); padding: 22px; background: var(--bg); min-height: 100vh; color: var(--text);">
        <h1 style="font-family: var(--font-display); font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.5rem;">
          Diddit colours (Poeng)
        </h1>
        <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 1rem;">
          One yellow, warm greys, and two semantic colours that only appear where they mean something.
        </p>
        @for (group of groups; track group.title) {
          <section style="margin-bottom: 2rem;">
            <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem;">{{ group.title }}</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
              @for (s of group.swatches; track s.token) {
                <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card);">
                  <div
                    style="height: 96px; border-radius: var(--r-card); margin-bottom: 12px; display: flex; align-items: flex-end; padding: 10px; font-weight: 600;"
                    [style.background]="'var(' + s.token + ')'"
                    [style.color]="s.on"
                  >
                    Aa
                  </div>
                  <h3 style="font-family: var(--font-text); font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem;">{{ s.name }}</h3>
                  <code style="display: block; color: var(--text-muted); font-size: 0.8125rem;">{{ s.token }} {{ s.hex }}</code>
                  <p style="color: var(--text-muted); font-size: 0.8125rem; margin-top: 0.25rem;">{{ s.use }}</p>
                </div>
              }
            </div>
          </section>
        }
      </div>
    `,
  }),
};
