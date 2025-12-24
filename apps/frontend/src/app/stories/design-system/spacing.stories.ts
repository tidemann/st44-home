import type { Meta, StoryObj } from '@storybook/angular';

const meta: Meta = {
  title: 'Design System/Spacing',
  tags: ['autodocs'],
};

export default meta;

export const Scale: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 2rem;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 2rem;">Spacing Scale</h1>

        <div style="display: grid; gap: 1.5rem;">
          <div style="display: grid; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="min-width: 100px; font-weight: 600;">0.25rem (4px)</div>
              <div style="width: 4px; height: 40px; background: #6366F1;"></div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="min-width: 100px; font-weight: 600;">0.5rem (8px)</div>
              <div style="width: 8px; height: 40px; background: #6366F1;"></div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="min-width: 100px; font-weight: 600;">0.75rem (12px)</div>
              <div style="width: 12px; height: 40px; background: #6366F1;"></div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="min-width: 100px; font-weight: 600;">1rem (16px)</div>
              <div style="width: 16px; height: 40px; background: #6366F1;"></div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="min-width: 100px; font-weight: 600;">1.25rem (20px)</div>
              <div style="width: 20px; height: 40px; background: #6366F1;"></div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="min-width: 100px; font-weight: 600;">1.5rem (24px)</div>
              <div style="width: 24px; height: 40px; background: #6366F1;"></div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="min-width: 100px; font-weight: 600;">2rem (32px)</div>
              <div style="width: 32px; height: 40px; background: #6366F1;"></div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="min-width: 100px; font-weight: 600;">2.5rem (40px)</div>
              <div style="width: 40px; height: 40px; background: #6366F1;"></div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="min-width: 100px; font-weight: 600;">3rem (48px)</div>
              <div style="width: 48px; height: 40px; background: #6366F1;"></div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="min-width: 100px; font-weight: 600;">4rem (64px)</div>
              <div style="width: 64px; height: 40px; background: #6366F1;"></div>
            </div>
          </div>

          <div style="background: #F8FAFC; padding: 1.5rem; border-radius: 8px; margin-top: 2rem;">
            <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">Usage Guidelines</h2>
            <div style="display: grid; gap: 0.75rem; color: #475569;">
              <div><strong>0.25rem-0.5rem:</strong> Icon spacing, tight padding</div>
              <div><strong>0.75rem-1rem:</strong> Button padding, small gaps</div>
              <div><strong>1.5rem-2rem:</strong> Card padding, section spacing</div>
              <div><strong>2.5rem-4rem:</strong> Large sections, page margins</div>
            </div>
          </div>
        </div>
      </div>
    `,
  }),
};

export const Examples: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 2rem;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 2rem;">Spacing Examples</h1>

        <div style="display: grid; gap: 2rem;">
          <!-- Card Padding Example -->
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Card Padding</h2>
            <div style="background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 1.5rem;">
              <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Card Title</h3>
              <p style="color: #475569; margin: 0;">
                This card uses 1.5rem (24px) padding on all sides. The title has 0.75rem (12px) margin bottom.
              </p>
            </div>
          </div>

          <!-- Button Spacing Example -->
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Button Spacing</h2>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <button style="background: #6366F1; color: white; padding: 0.5rem 1rem; border-radius: 6px; border: none; font-weight: 500; cursor: pointer;">
                Small Button
              </button>
              <button style="background: #6366F1; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; border: none; font-weight: 500; cursor: pointer;">
                Medium Button
              </button>
              <button style="background: #6366F1; color: white; padding: 1rem 2rem; border-radius: 6px; border: none; font-weight: 500; cursor: pointer;">
                Large Button
              </button>
            </div>
          </div>

          <!-- List Spacing Example -->
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">List Spacing</h2>
            <div style="background: white; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
              <div style="padding: 1rem; border-bottom: 1px solid #E2E8F0;">
                <div style="font-weight: 600;">List Item 1</div>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.25rem;">Description text</div>
              </div>
              <div style="padding: 1rem; border-bottom: 1px solid #E2E8F0;">
                <div style="font-weight: 600;">List Item 2</div>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.25rem;">Description text</div>
              </div>
              <div style="padding: 1rem;">
                <div style="font-weight: 600;">List Item 3</div>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.25rem;">Description text</div>
              </div>
            </div>
          </div>

          <!-- Grid Spacing Example -->
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Grid Spacing</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
              <div style="background: #EEF2FF; padding: 1.5rem; border-radius: 8px; text-align: center;">
                <div style="font-weight: 600;">Grid Item 1</div>
              </div>
              <div style="background: #EEF2FF; padding: 1.5rem; border-radius: 8px; text-align: center;">
                <div style="font-weight: 600;">Grid Item 2</div>
              </div>
              <div style="background: #EEF2FF; padding: 1.5rem; border-radius: 8px; text-align: center;">
                <div style="font-weight: 600;">Grid Item 3</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
  }),
};
