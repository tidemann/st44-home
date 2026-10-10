import type { Meta, StoryObj } from '@storybook/angular';

/**
 * Diddit gradients: Poeng has none.
 * The legacy --gradient-* tokens stay defined so older screens keep working, but each
 * one now resolves to a single flat Poeng colour. Each keeps the text colour that is
 * legal on it.
 */
const meta: Meta = {
  title: 'Design System/Gradients',
  tags: ['autodocs'],
};

export default meta;

interface LegacyGradient {
  token: string;
  resolvesTo: string;
  text: string;
  textName: string;
  note: string;
}

const legacy: LegacyGradient[] = [
  {
    token: '--gradient-primary',
    resolvesTo: '--ink',
    text: 'var(--surface)',
    textName: 'white',
    note: 'Was behind white titles. Now an ink surface.',
  },
  {
    token: '--gradient-primary-button',
    resolvesTo: '--ink',
    text: 'var(--surface)',
    textName: 'white',
    note: 'Was the white-text button. Yellow primary buttons use .btn-primary instead.',
  },
  {
    token: '--gradient-purple',
    resolvesTo: '--ink',
    text: 'var(--surface)',
    textName: 'white',
    note: 'Now ink.',
  },
  {
    token: '--gradient-success',
    resolvesTo: '--done',
    text: 'var(--surface)',
    textName: 'white',
    note: 'Now Done green.',
  },
  {
    token: '--gradient-accent',
    resolvesTo: '--yellow',
    text: 'var(--ink)',
    textName: 'ink',
    note: 'Now the yellow. Ink text only; never white, never amber-ink.',
  },
];

export const Gradients: StoryObj = {
  render: () => ({
    props: { legacy },
    template: `
      <div style="font-family: var(--font-text); padding: 22px; background: var(--bg); min-height: 100vh; color: var(--text);">
        <h1 style="font-family: var(--font-display); font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.5rem;">
          Gradients (Poeng has none)
        </h1>
        <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 1rem; font-weight: 500; max-width: 640px;">
          Every surface in Diddit is one flat colour. The legacy gradient tokens remain so older
          screens keep rendering, but each resolves to a flat Poeng colour. Do not use them in new
          code; use the colour token directly.
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px;">
          @for (g of legacy; track g.token) {
            <div style="background: var(--surface); padding: 15px; border-radius: var(--r-card);">
              <div
                style="height: 96px; border-radius: var(--r-card); margin-bottom: 12px; display: flex; align-items: flex-end; padding: 10px; font-weight: 600; font-size: 16px;"
                [style.background]="'var(' + g.resolvesTo + ')'"
                [style.color]="g.text"
              >
                {{ g.textName }} text
              </div>
              <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;"><code>{{ g.token }}</code></h3>
              <code style="display: block; color: var(--text-muted); font-size: 13px;">resolves to {{ g.resolvesTo }}, {{ g.textName }} text</code>
              <p style="color: var(--text-muted); font-size: 13px; font-weight: 500; margin-top: 4px;">{{ g.note }}</p>
            </div>
          }
        </div>
      </div>
    `,
  }),
};
