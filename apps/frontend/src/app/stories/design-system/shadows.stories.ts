import type { Meta, StoryObj } from '@storybook/angular';

/**
 * Diddit elevation: Poeng, light mode.
 * Spec: docs/design/diddit/DESIGN-GUIDE.md (Elevation & Depth, Shapes).
 * The Flat Rule: nothing casts a shadow. Depth is a tonal step. Strokes carry meaning.
 */
const meta: Meta = {
  title: 'Design System/Shadows & Elevation',
  tags: ['autodocs'],
};

export default meta;

export const Shadows: StoryObj = {
  render: () => ({
    template: `
      <div style="font-family: var(--font-text); padding: 22px; background: var(--bg); min-height: 100vh; color: var(--text);">
        <h1 style="font-family: var(--font-display); font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.5rem;">
          Elevation (Poeng)
        </h1>
        <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 1rem; font-weight: 500; max-width: 640px;">
          The Flat Rule: there is no box-shadow anywhere in Diddit, and cards have no borders.
          If something needs to separate from what is behind it, step the tone; do not lift it.
          The legacy --shadow-* tokens all resolve to none.
        </p>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem;">Depth is a tonal step</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px;">
            <div style="background: var(--bg); padding: 15px 0;">
              <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card);">
                <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">White card on the background</h3>
                <p style="color: var(--text-muted); font-size: 13px; font-weight: 500;">
                  --surface on --bg. That one step is the whole light-screen elevation vocabulary.
                </p>
              </div>
            </div>
            <div style="background: var(--yellow); padding: 15px; border-radius: var(--r-card);">
              <div style="background: var(--yellow-inset); padding: 15px; border-radius: var(--r-card); color: var(--ink);">
                <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">Inset on the yellow</h3>
                <p style="font-size: 13px; font-weight: 500;">
                  --yellow-inset on --yellow. Same hue, one step darker. Text is ink.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">The three legal strokes</h2>
          <p style="color: var(--text-muted); font-size: 15px; font-weight: 500; margin-bottom: 1rem;">
            A visible stroke carries state, a control boundary, or a structure. Never decoration.
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px;">
            <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card); border: 2px solid var(--overdue);">
              <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">State: overdue</h3>
              <p style="font-size: 13px; font-weight: 500; color: var(--overdue); margin-bottom: 4px;">Forfalt</p>
              <code style="color: var(--text-muted); font-size: 13px;">2px var(--overdue)</code>
            </div>
            <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card); display: flex; gap: 12px; align-items: flex-start;">
              <span style="flex: none; width: 24px; height: 24px; border: 2px solid var(--text-muted); border-radius: 7px;"></span>
              <div>
                <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">Control boundary</h3>
                <p style="color: var(--text-muted); font-size: 13px; font-weight: 500; margin-bottom: 4px;">An unchecked checkbox.</p>
                <code style="color: var(--text-muted); font-size: 13px;">2px var(--text-muted)</code>
              </div>
            </div>
            <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card);">
              <h3 style="font-size: 16px; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid var(--hairline); margin-bottom: 8px;">Structural divider</h3>
              <p style="color: var(--text-muted); font-size: 13px; font-weight: 500; margin-bottom: 4px;">Above the nav, under a heading.</p>
              <code style="color: var(--text-muted); font-size: 13px;">1px var(--hairline)</code>
            </div>
          </div>
        </section>
      </div>
    `,
  }),
};

const radii: { name: string; value: string; css: string; w: string; h: string; use: string }[] = [
  {
    name: 'Card',
    value: '12px',
    css: 'var(--r-card)',
    w: '120px',
    h: '72px',
    use: 'Cards and rows.',
  },
  {
    name: 'Button',
    value: '13px',
    css: 'var(--r-button)',
    w: '120px',
    h: '49px',
    use: 'Full-width primary and the on-yellow pair.',
  },
  {
    name: 'Row action',
    value: '10px',
    css: 'var(--r-row-action)',
    w: '80px',
    h: '36px',
    use: 'Buttons inside a row ("Hak av").',
  },
  { name: 'Chip', value: '9px', css: 'var(--r-chip)', w: '80px', h: '32px', use: 'Filter chips.' },
  {
    name: 'Meter segment',
    value: 'pill',
    css: '9999px',
    w: '120px',
    h: '8px',
    use: 'Fully rounded points-meter segments.',
  },
  {
    name: 'Initial badge',
    value: 'circle, 38px',
    css: '50%',
    w: '38px',
    h: '38px',
    use: 'The person badge in the title row.',
  },
];

export const BorderRadius: StoryObj = {
  render: () => ({
    props: { radii },
    template: `
      <div style="font-family: var(--font-text); padding: 22px; background: var(--bg); min-height: 100vh; color: var(--text);">
        <h1 style="font-family: var(--font-display); font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.5rem;">
          Shapes (Poeng)
        </h1>
        <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 1rem; font-weight: 500;">
          Softly rounded rectangles. Nothing is a circle except the person badges.
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
          @for (r of radii; track r.name) {
            <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card);">
              <div style="height: 80px; display: flex; align-items: center; margin-bottom: 12px;">
                <div
                  [style.width]="r.w"
                  [style.height]="r.h"
                  [style.border-radius]="r.css"
                  [style.background]="r.name === 'Initial badge' ? 'var(--track)' : 'var(--yellow)'"
                  style="display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 800; color: var(--text);"
                >
                  {{ r.name === 'Initial badge' ? 'E' : '' }}
                </div>
              </div>
              <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">{{ r.name }}</h3>
              <code style="display: block; color: var(--text-muted); font-size: 13px;">{{ r.value }} · {{ r.css }}</code>
              <p style="color: var(--text-muted); font-size: 13px; font-weight: 500; margin-top: 4px;">{{ r.use }}</p>
            </div>
          }
        </div>
      </div>
    `,
  }),
};
