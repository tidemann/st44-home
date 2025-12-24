import type { Meta, StoryObj } from '@storybook/angular';

const meta: Meta = {
  title: 'Design System/Colors',
  tags: ['autodocs'],
};

export default meta;

export const Primary: StoryObj = {
  render: () => ({
    template: `
      <div style="font-family: var(--font-body, 'Outfit', sans-serif); padding: 2rem; background: var(--color-background, #F8F9FF); min-height: 100vh;">
        <h1 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem; background: var(--gradient-primary, linear-gradient(135deg, #6366F1 0%, #EC4899 100%)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
          Diddit! Color Palette
        </h1>
        <p style="color: var(--color-text-secondary, #64748b); margin-bottom: 3rem; font-size: 1.125rem;">Playful & Modern - Vibrant colors for an engaging household task management experience</p>

        <div style="display: grid; gap: 3rem;">
          <!-- Brand Colors -->
          <section>
            <h2 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-size: 1.75rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--color-text-primary, #1E293B);">Brand Colors</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem;">
              <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md, 24px); box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));">
                <div style="width: 100%; height: 120px; background: var(--color-primary, #6366F1); border-radius: var(--radius-sm, 16px); margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);"></div>
                <h3 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-weight: 700; font-size: 1.125rem; margin-bottom: 0.25rem;">Primary</h3>
                <code style="display: block; color: var(--color-text-secondary, #64748b); font-size: 0.875rem; margin-bottom: 0.25rem;">#6366F1</code>
                <p style="color: var(--color-text-tertiary, #94A3B8); font-size: 0.8125rem;">Indigo - Main brand color</p>
              </div>

              <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md, 24px); box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));">
                <div style="width: 100%; height: 120px; background: var(--color-secondary, #EC4899); border-radius: var(--radius-sm, 16px); margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);"></div>
                <h3 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-weight: 700; font-size: 1.125rem; margin-bottom: 0.25rem;">Secondary</h3>
                <code style="display: block; color: var(--color-text-secondary, #64748b); font-size: 0.875rem; margin-bottom: 0.25rem;">#EC4899</code>
                <p style="color: var(--color-text-tertiary, #94A3B8); font-size: 0.8125rem;">Pink - Accent brand color</p>
              </div>

              <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md, 24px); box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));">
                <div style="width: 100%; height: 120px; background: var(--color-accent, #FBBF24); border-radius: var(--radius-sm, 16px); margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);"></div>
                <h3 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-weight: 700; font-size: 1.125rem; margin-bottom: 0.25rem;">Accent</h3>
                <code style="display: block; color: var(--color-text-secondary, #64748b); font-size: 0.875rem; margin-bottom: 0.25rem;">#FBBF24</code>
                <p style="color: var(--color-text-tertiary, #94A3B8); font-size: 0.8125rem;">Yellow - Highlights & rewards</p>
              </div>
            </div>
          </section>

          <!-- Semantic Colors -->
          <section>
            <h2 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-size: 1.75rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--color-text-primary, #1E293B);">Semantic Colors</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem;">
              <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md, 24px); box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));">
                <div style="width: 100%; height: 120px; background: var(--color-success, #10B981); border-radius: var(--radius-sm, 16px); margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);"></div>
                <h3 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-weight: 700; font-size: 1.125rem; margin-bottom: 0.25rem;">Success</h3>
                <code style="display: block; color: var(--color-text-secondary, #64748b); font-size: 0.875rem; margin-bottom: 0.25rem;">#10B981</code>
                <p style="color: var(--color-text-tertiary, #94A3B8); font-size: 0.8125rem;">Green - Completions, success</p>
              </div>

              <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md, 24px); box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));">
                <div style="width: 100%; height: 120px; background: var(--color-purple, #A855F7); border-radius: var(--radius-sm, 16px); margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);"></div>
                <h3 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-weight: 700; font-size: 1.125rem; margin-bottom: 0.25rem;">Purple</h3>
                <code style="display: block; color: var(--color-text-secondary, #64748b); font-size: 0.875rem; margin-bottom: 0.25rem;">#A855F7</code>
                <p style="color: var(--color-text-tertiary, #94A3B8); font-size: 0.8125rem;">Purple - Secondary accent</p>
              </div>

              <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md, 24px); box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));">
                <div style="width: 100%; height: 120px; background: var(--color-orange, #F97316); border-radius: var(--radius-sm, 16px); margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);"></div>
                <h3 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-weight: 700; font-size: 1.125rem; margin-bottom: 0.25rem;">Orange</h3>
                <code style="display: block; color: var(--color-text-secondary, #64748b); font-size: 0.875rem; margin-bottom: 0.25rem;">#F97316</code>
                <p style="color: var(--color-text-tertiary, #94A3B8); font-size: 0.8125rem;">Orange - Warm accent</p>
              </div>
            </div>
          </section>

          <!-- Text Colors -->
          <section>
            <h2 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-size: 1.75rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--color-text-primary, #1E293B);">Text Colors</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;">
              <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md, 24px); box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));">
                <p style="font-size: 2rem; font-weight: 700; color: var(--color-text-primary, #1E293B); margin-bottom: 0.75rem;">Aa</p>
                <h3 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-weight: 700; font-size: 1.125rem; margin-bottom: 0.25rem;">Primary</h3>
                <code style="display: block; color: var(--color-text-secondary, #64748b); font-size: 0.875rem;">#1E293B</code>
                <p style="color: var(--color-text-tertiary, #94A3B8); font-size: 0.8125rem; margin-top: 0.5rem;">Main body text, headings</p>
              </div>

              <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md, 24px); box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));">
                <p style="font-size: 2rem; font-weight: 700; color: var(--color-text-secondary, #64748b); margin-bottom: 0.75rem;">Aa</p>
                <h3 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-weight: 700; font-size: 1.125rem; margin-bottom: 0.25rem;">Secondary</h3>
                <code style="display: block; color: var(--color-text-secondary, #64748b); font-size: 0.875rem;">#64748B</code>
                <p style="color: var(--color-text-tertiary, #94A3B8); font-size: 0.8125rem; margin-top: 0.5rem;">Secondary text, labels</p>
              </div>

              <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md, 24px); box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));">
                <p style="font-size: 2rem; font-weight: 700; color: var(--color-text-tertiary, #94A3B8); margin-bottom: 0.75rem;">Aa</p>
                <h3 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-weight: 700; font-size: 1.125rem; margin-bottom: 0.25rem;">Tertiary</h3>
                <code style="display: block; color: var(--color-text-secondary, #64748b); font-size: 0.875rem;">#94A3B8</code>
                <p style="color: var(--color-text-tertiary, #94A3B8); font-size: 0.8125rem; margin-top: 0.5rem;">Placeholders, disabled text</p>
              </div>
            </div>
          </section>

          <!-- Surface Colors -->
          <section>
            <h2 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-size: 1.75rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--color-text-primary, #1E293B);">Surface Colors</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;">
              <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md, 24px); box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08)); border: 2px solid var(--color-background, #F8F9FF);">
                <div style="width: 100%; height: 80px; background: var(--color-background, #F8F9FF); border-radius: var(--radius-sm, 16px); margin-bottom: 1rem; border: 1px solid #E2E8F0;"></div>
                <h3 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-weight: 700; font-size: 1.125rem; margin-bottom: 0.25rem;">Background</h3>
                <code style="display: block; color: var(--color-text-secondary, #64748b); font-size: 0.875rem;">#F8F9FF</code>
                <p style="color: var(--color-text-tertiary, #94A3B8); font-size: 0.8125rem; margin-top: 0.5rem;">App background</p>
              </div>

              <div style="background: var(--color-background, #F8F9FF); padding: 1.5rem; border-radius: var(--radius-md, 24px); box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.08));">
                <div style="width: 100%; height: 80px; background: var(--color-surface, #FFFFFF); border-radius: var(--radius-sm, 16px); margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06);"></div>
                <h3 style="font-family: var(--font-heading, 'Fredoka', sans-serif); font-weight: 700; font-size: 1.125rem; margin-bottom: 0.25rem;">Surface</h3>
                <code style="display: block; color: var(--color-text-secondary, #64748b); font-size: 0.875rem;">#FFFFFF</code>
                <p style="color: var(--color-text-tertiary, #94A3B8); font-size: 0.8125rem; margin-top: 0.5rem;">Cards, modals, containers</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    `,
  }),
};
