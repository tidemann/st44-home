import type { Meta, StoryObj } from '@storybook/angular';

/**
 * Diddit typography: Poeng, light mode.
 * Spec: docs/design/diddit/DESIGN-GUIDE.md (Typography). Two fonts, no third.
 * Bricolage Grotesque 800 for titles and every number; Hanken Grotesk 500/600 for
 * everything read as a sentence. No italics, no uppercase tracking.
 */
const meta: Meta = {
  title: 'Design System/Typography',
  tags: ['autodocs'],
};

export default meta;

interface TypeStyle {
  name: string;
  family: 'display' | 'text';
  size: string;
  weight: number;
  lineHeight: string;
  /** Display numerals are tabular with -0.02em tracking */
  numeric: boolean;
  sample: string;
  use: string;
}

const hierarchy: TypeStyle[] = [
  {
    name: 'Display',
    family: 'display',
    size: '94px',
    weight: 800,
    lineHeight: '0.95',
    numeric: true,
    sample: '+10',
    use: 'Points won in the tick-off moment. The largest thing in the product.',
  },
  {
    name: 'Display sm',
    family: 'display',
    size: '83px',
    weight: 800,
    lineHeight: '0.95',
    numeric: true,
    sample: '215',
    use: "A child's total on their own chore screen.",
  },
  {
    name: 'Display xs',
    family: 'display',
    size: '59px',
    weight: 800,
    lineHeight: '0.95',
    numeric: true,
    sample: '225',
    use: 'The balance at the top of the rewards screen.',
  },
  {
    name: 'Display unit',
    family: 'display',
    size: '23px',
    weight: 800,
    lineHeight: '1',
    numeric: false,
    sample: 'poeng',
    use: 'The word "poeng" on the baseline beside "+10".',
  },
  {
    name: 'Number',
    family: 'display',
    size: '30px',
    weight: 800,
    lineHeight: '1',
    numeric: true,
    sample: '340',
    use: "A child's total on a family card.",
  },
  {
    name: 'Title',
    family: 'display',
    size: '27px',
    weight: 800,
    lineHeight: '1.15',
    numeric: false,
    sample: 'Oppgaver',
    use: 'The screen name.',
  },
  {
    name: 'Button label',
    family: 'text',
    size: '16.5px',
    weight: 600,
    lineHeight: '1.35',
    numeric: false,
    sample: '+ Ny oppgave',
    use: 'The full-width primary button only.',
  },
  {
    name: 'Body',
    family: 'text',
    size: '16px',
    weight: 600,
    lineHeight: '1.35',
    numeric: false,
    sample: 'Dekke bord',
    use: 'Chore, reward and history titles; row action labels.',
  },
  {
    name: 'Meta',
    family: 'text',
    size: '15px',
    weight: 500,
    lineHeight: '1.4',
    numeric: false,
    sample: 'Haket av 16.48',
    use: 'The second line outside a card.',
  },
  {
    name: 'Meta sm',
    family: 'text',
    size: '13px',
    weight: 500,
    lineHeight: '1.4',
    numeric: false,
    sample: 'Mathea – I dag 16.30',
    use: 'The same voice inside a card, one step down.',
  },
  {
    name: 'Label',
    family: 'text',
    size: '13px',
    weight: 600,
    lineHeight: '1.3',
    numeric: false,
    sample: 'Forfalt',
    use: 'Group labels. Deliberately smaller than Meta.',
  },
  {
    name: 'Caption',
    family: 'text',
    size: '12px',
    weight: 600,
    lineHeight: '1.3',
    numeric: false,
    sample: 'Hjem',
    use: 'Bottom-nav labels.',
  },
];

export const Fonts: StoryObj = {
  render: () => ({
    props: { hierarchy },
    template: `
      <div style="font-family: var(--font-text); padding: 22px; background: var(--bg); min-height: 100vh; color: var(--text);">
        <h1 style="font-family: var(--font-display); font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.5rem;">
          Diddit typography (Poeng)
        </h1>
        <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 1rem; font-weight: 500;">
          Two fonts do the whole hierarchy. No third font, no italics, no uppercase tracking.
        </p>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem;">Font families</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px;">
            <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card);">
              <code style="display: block; color: var(--text-muted); font-size: 13px; margin-bottom: 8px;">--font-display</code>
              <div style="font-family: var(--font-display); font-weight: 800; font-size: 40px; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; margin-bottom: 12px;">
                Aa 0123456789
              </div>
              <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">Bricolage Grotesque, 800 only</h3>
              <p style="color: var(--text-muted); font-size: 13px; font-weight: 500;">
                Screen titles and every number. Numbers are always tabular-nums; display numerals carry -0.02em letter-spacing.
              </p>
            </div>
            <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card);">
              <code style="display: block; color: var(--text-muted); font-size: 13px; margin-bottom: 8px;">--font-text</code>
              <div style="font-family: var(--font-text); font-weight: 600; font-size: 40px; line-height: 1; margin-bottom: 12px;">
                Aa <span style="font-weight: 500;">Aa</span>
              </div>
              <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">Hanken Grotesk, 500 and 600</h3>
              <p style="color: var(--text-muted); font-size: 13px; font-weight: 500;">
                Everything a person reads as a sentence: titles of chores, meta lines, labels, buttons.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem;">Hierarchy</h2>
          <div style="display: grid; gap: 8px;">
            @for (t of hierarchy; track t.name) {
              <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card); display: grid; grid-template-columns: 200px 1fr; gap: 15px; align-items: center;">
                <div>
                  <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">{{ t.name }}</h3>
                  <code style="display: block; color: var(--text-muted); font-size: 13px;">
                    {{ t.family === 'display' ? 'Bricolage' : 'Hanken' }} {{ t.weight }} / {{ t.size }} / {{ t.lineHeight }}{{ t.numeric ? ' / -0.02em tabular' : '' }}
                  </code>
                  <p style="color: var(--text-muted); font-size: 13px; font-weight: 500; margin-top: 4px;">{{ t.use }}</p>
                </div>
                <div
                  [style.font-family]="t.family === 'display' ? 'var(--font-display)' : 'var(--font-text)'"
                  [style.font-size]="t.size"
                  [style.font-weight]="t.weight"
                  [style.line-height]="t.lineHeight"
                  [style.letter-spacing]="t.numeric ? '-0.02em' : 'normal'"
                  [style.font-variant-numeric]="t.numeric ? 'tabular-nums' : 'normal'"
                >
                  {{ t.sample }}
                </div>
              </div>
            }
          </div>
          <p style="color: var(--text-muted); font-size: 13px; font-weight: 500; margin-top: 12px;">
            One Hero Rule: a screen carries exactly one Display, Display sm or Display xs number.
          </p>
        </section>
      </div>
    `,
  }),
};

export const Example: StoryObj = {
  render: () => ({
    template: `
      <div style="font-family: var(--font-text); padding: 22px; background: var(--bg); min-height: 100vh; color: var(--text); max-width: 390px;">
        <h1 style="font-family: var(--font-display); font-size: 27px; font-weight: 800; line-height: 1.15; margin-bottom: 20px;">Oppgaver</h1>

        <div style="margin-bottom: 20px;">
          <div style="font-family: var(--font-display); font-size: 83px; font-weight: 800; line-height: 0.95; letter-spacing: -0.02em; font-variant-numeric: tabular-nums;">215</div>
          <div style="font-size: 15px; font-weight: 500; line-height: 1.4; color: var(--text-muted);">poeng</div>
        </div>

        <h2 style="font-size: 13px; font-weight: 600; line-height: 1.3; color: var(--text-muted); margin-bottom: 8px;">I dag</h2>
        <div style="display: grid; gap: 8px; margin-bottom: 24px;">
          <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card);">
            <div style="font-size: 16px; font-weight: 600; line-height: 1.35;">Dekke bord</div>
            <div style="font-size: 13px; font-weight: 500; line-height: 1.4; color: var(--text-muted);">
              Mathea – I dag 16.30 · <span style="color: var(--amber-ink); font-variant-numeric: tabular-nums;">5 p</span>
            </div>
          </div>
          <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card);">
            <div style="font-size: 16px; font-weight: 600; line-height: 1.35;">Rydde rommet</div>
            <div style="font-size: 13px; font-weight: 500; line-height: 1.4; color: var(--text-muted);">
              Emma – I dag 18.00 · <span style="color: var(--amber-ink); font-variant-numeric: tabular-nums;">10 p</span>
            </div>
          </div>
        </div>

        <button style="width: 100%; height: 49px; border: none; border-radius: var(--r-button); background: var(--yellow); color: var(--ink); font-family: var(--font-text); font-size: 16.5px; font-weight: 600; line-height: 1.35; cursor: pointer;">
          + Ny oppgave
        </button>
      </div>
    `,
  }),
};
