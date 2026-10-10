import type { Meta, StoryObj } from '@storybook/angular';

/**
 * Diddit spacing: Poeng, light mode.
 * Spec: docs/design/diddit/DESIGN-GUIDE.md (Layout). Scale 4 / 8 / 12 / 15 / 20 / 24,
 * a 22px screen gutter, 15px card padding, 8px between cards.
 */
const meta: Meta = {
  title: 'Design System/Spacing',
  tags: ['autodocs'],
};

export default meta;

interface Step {
  px: number;
  use: string;
}

const scale: Step[] = [
  { px: 4, use: 'Gaps between points-meter segments.' },
  { px: 8, use: 'Default gap between siblings, and between cards.' },
  { px: 12, use: 'Padding inside the narrow child cards.' },
  { px: 15, use: 'Default padding inside a full-width card.' },
  { px: 20, use: 'Break before a group label.' },
  { px: 24, use: 'Gutter on the tick-off screen only.' },
];

const layout: { name: string; value: string; use: string }[] = [
  {
    name: 'Screen gutter',
    value: '22px (--gutter)',
    use: 'Gives a 346px content column on a 390px phone.',
  },
  { name: 'Card padding', value: '15px', use: 'Full-width cards. Narrow child cards use 12px.' },
  {
    name: 'Card rhythm',
    value: '8px',
    use: 'Between cards, with a larger break before a group label.',
  },
  { name: 'Chore row', value: '68px tall', use: 'One chore per row.' },
  {
    name: 'Primary button',
    value: '346 × 49px',
    use: 'Pinned above the nav; the on-yellow pair is also 49px.',
  },
];

export const Scale: StoryObj = {
  render: () => ({
    props: { scale, layout },
    template: `
      <div style="font-family: var(--font-text); padding: 22px; background: var(--bg); min-height: 100vh; color: var(--text);">
        <h1 style="font-family: var(--font-display); font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.5rem;">
          Diddit spacing (Poeng)
        </h1>
        <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 1rem; font-weight: 500;">
          Six steps. Use these values and nothing in between.
        </p>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem;">Scale</h2>
          <div style="display: grid; gap: 8px;">
            @for (s of scale; track s.px) {
              <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card); display: grid; grid-template-columns: 64px 120px 1fr; gap: 15px; align-items: center;">
                <span style="font-family: var(--font-display); font-weight: 800; font-size: 24px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em;">{{ s.px }}</span>
                <div style="height: 24px; background: var(--yellow); border-radius: 4px;" [style.width.px]="s.px * 4"></div>
                <span style="color: var(--text-muted); font-size: 13px; font-weight: 500;">{{ s.use }}</span>
              </div>
            }
          </div>
          <p style="color: var(--text-muted); font-size: 13px; font-weight: 500; margin-top: 8px;">Bars drawn at 4× scale.</p>
        </section>

        <section>
          <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem;">Layout measures</h2>
          <div style="display: grid; gap: 8px;">
            @for (l of layout; track l.name) {
              <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card);">
                <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">{{ l.name }} <code style="color: var(--text-muted); font-size: 13px; font-weight: 500;">{{ l.value }}</code></h3>
                <p style="color: var(--text-muted); font-size: 13px; font-weight: 500;">{{ l.use }}</p>
              </div>
            }
          </div>
        </section>
      </div>
    `,
  }),
};

export const Examples: StoryObj = {
  render: () => ({
    template: `
      <div style="font-family: var(--font-text); background: var(--bg); min-height: 100vh; color: var(--text); max-width: 390px; padding: 24px var(--gutter);">
        <h1 style="font-family: var(--font-display); font-size: 27px; font-weight: 800; line-height: 1.15; margin-bottom: 20px;">Hjemme</h1>

        <p style="color: var(--text-muted); font-size: 13px; font-weight: 500; margin-bottom: 8px;">Three child cards across, 9px apart, 12px padding</p>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-bottom: 20px;">
          <div style="background: var(--surface); padding: 12px; border-radius: var(--r-card);">
            <div style="font-family: var(--font-display); font-size: 30px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums;">340</div>
            <div style="font-size: 15px; font-weight: 500; color: var(--text-muted);">Emma</div>
          </div>
          <div style="background: var(--surface); padding: 12px; border-radius: var(--r-card);">
            <div style="font-family: var(--font-display); font-size: 30px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums;">215</div>
            <div style="font-size: 15px; font-weight: 500; color: var(--text-muted);">Mathea</div>
          </div>
          <div style="background: var(--surface); padding: 12px; border-radius: var(--r-card);">
            <div style="font-family: var(--font-display); font-size: 30px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums;">90</div>
            <div style="font-size: 15px; font-weight: 500; color: var(--text-muted);">Jonas</div>
          </div>
        </div>

        <h2 style="font-size: 13px; font-weight: 600; line-height: 1.3; color: var(--text-muted); margin-bottom: 8px;">I dag</h2>
        <p style="color: var(--text-muted); font-size: 13px; font-weight: 500; margin-bottom: 8px;">Full-width cards, 15px padding, 8px apart, no borders, no shadows</p>
        <div style="display: grid; gap: 8px; margin-bottom: 24px;">
          <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div>
              <div style="font-size: 16px; font-weight: 600;">Dekke bord</div>
              <div style="font-size: 13px; font-weight: 500; color: var(--text-muted);">Mathea – I dag 16.30</div>
            </div>
            <button style="border: none; background: var(--yellow); color: var(--ink); border-radius: var(--r-row-action); padding: 8px 12px; font-family: var(--font-text); font-size: 16px; font-weight: 600; cursor: pointer;">Hak av</button>
          </div>
          <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card);">
            <div style="font-size: 16px; font-weight: 600;">Rydde rommet</div>
            <div style="font-size: 13px; font-weight: 500; color: var(--text-muted);">Emma – I dag 18.00</div>
          </div>
        </div>

        <p style="color: var(--text-muted); font-size: 13px; font-weight: 500; margin-bottom: 8px;">Primary button: full column, 49px tall, 13px radius</p>
        <button style="width: 100%; height: 49px; border: none; border-radius: var(--r-button); background: var(--yellow); color: var(--ink); font-family: var(--font-text); font-size: 16.5px; font-weight: 600; cursor: pointer;">
          + Ny oppgave
        </button>
      </div>
    `,
  }),
};
