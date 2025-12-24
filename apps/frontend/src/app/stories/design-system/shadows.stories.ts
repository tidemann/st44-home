import type { Meta, StoryObj } from '@storybook/angular';

const meta: Meta = {
  title: 'Design System/Shadows & Elevation',
  tags: ['autodocs'],
};

export default meta;

export const Shadows: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 2rem; background: #F8F9FF;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 2rem;">Shadow System</h1>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem;">
          <!-- Shadow None -->
          <div>
            <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: none; border: 1px solid #E2E8F0; text-align: center;">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">None</div>
              <div style="color: #64748b; font-size: 0.875rem;">box-shadow: none</div>
            </div>
            <div style="margin-top: 0.75rem; color: #475569; font-size: 0.875rem;">
              Base elements, no elevation
            </div>
          </div>

          <!-- Shadow SM -->
          <div>
            <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); text-align: center;">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">Small</div>
              <div style="color: #64748b; font-size: 0.875rem;">0 1px 2px rgba(0,0,0,0.05)</div>
            </div>
            <div style="margin-top: 0.75rem; color: #475569; font-size: 0.875rem;">
              Subtle depth, tags, badges
            </div>
          </div>

          <!-- Shadow MD -->
          <div>
            <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); text-align: center;">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">Medium</div>
              <div style="color: #64748b; font-size: 0.875rem;">0 4px 6px rgba(0,0,0,0.1)</div>
            </div>
            <div style="margin-top: 0.75rem; color: #475569; font-size: 0.875rem;">
              Cards, buttons, inputs
            </div>
          </div>

          <!-- Shadow LG -->
          <div>
            <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); text-align: center;">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">Large</div>
              <div style="color: #64748b; font-size: 0.875rem;">0 10px 15px rgba(0,0,0,0.1)</div>
            </div>
            <div style="margin-top: 0.75rem; color: #475569; font-size: 0.875rem;">
              Popovers, dropdowns
            </div>
          </div>

          <!-- Shadow XL -->
          <div>
            <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); text-align: center;">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">Extra Large</div>
              <div style="color: #64748b; font-size: 0.875rem;">0 20px 25px rgba(0,0,0,0.1)</div>
            </div>
            <div style="margin-top: 0.75rem; color: #475569; font-size: 0.875rem;">
              Modals, elevated panels
            </div>
          </div>

          <!-- Shadow 2XL -->
          <div>
            <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); text-align: center;">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">2XL</div>
              <div style="color: #64748b; font-size: 0.875rem;">0 25px 50px rgba(0,0,0,0.25)</div>
            </div>
            <div style="margin-top: 0.75rem; color: #475569; font-size: 0.875rem;">
              Floating elements, dialogs
            </div>
          </div>
        </div>

        <div style="background: white; padding: 1.5rem; border-radius: 8px; margin-top: 3rem; border-left: 4px solid #6366F1;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">Usage Guidelines</h2>
          <ul style="color: #475569; padding-left: 1.5rem; margin: 0;">
            <li style="margin-bottom: 0.5rem;">Use shadows consistently to indicate elevation</li>
            <li style="margin-bottom: 0.5rem;">Higher elevation = larger shadow</li>
            <li style="margin-bottom: 0.5rem;">Avoid mixing shadow sizes on similar elements</li>
            <li>Consider accessibility - shadows should enhance, not be critical for understanding</li>
          </ul>
        </div>
      </div>
    `,
  }),
};

export const BorderRadius: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 2rem;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 2rem;">Border Radius</h1>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem;">
          <div style="text-align: center;">
            <div style="width: 150px; height: 150px; background: #6366F1; border-radius: 0; margin: 0 auto;"></div>
            <div style="margin-top: 1rem; font-weight: 600;">None</div>
            <div style="color: #64748b; font-size: 0.875rem;">0px</div>
          </div>

          <div style="text-align: center;">
            <div style="width: 150px; height: 150px; background: #6366F1; border-radius: 4px; margin: 0 auto;"></div>
            <div style="margin-top: 1rem; font-weight: 600;">Small</div>
            <div style="color: #64748b; font-size: 0.875rem;">4px</div>
          </div>

          <div style="text-align: center;">
            <div style="width: 150px; height: 150px; background: #6366F1; border-radius: 6px; margin: 0 auto;"></div>
            <div style="margin-top: 1rem; font-weight: 600;">Base</div>
            <div style="color: #64748b; font-size: 0.875rem;">6px</div>
          </div>

          <div style="text-align: center;">
            <div style="width: 150px; height: 150px; background: #6366F1; border-radius: 8px; margin: 0 auto;"></div>
            <div style="margin-top: 1rem; font-weight: 600;">Medium</div>
            <div style="color: #64748b; font-size: 0.875rem;">8px</div>
          </div>

          <div style="text-align: center;">
            <div style="width: 150px; height: 150px; background: #6366F1; border-radius: 12px; margin: 0 auto;"></div>
            <div style="margin-top: 1rem; font-weight: 600;">Large</div>
            <div style="color: #64748b; font-size: 0.875rem;">12px</div>
          </div>

          <div style="text-align: center;">
            <div style="width: 150px; height: 150px; background: #6366F1; border-radius: 16px; margin: 0 auto;"></div>
            <div style="margin-top: 1rem; font-weight: 600;">XL</div>
            <div style="color: #64748b; font-size: 0.875rem;">16px</div>
          </div>

          <div style="text-align: center;">
            <div style="width: 150px; height: 150px; background: #6366F1; border-radius: 9999px; margin: 0 auto;"></div>
            <div style="margin-top: 1rem; font-weight: 600;">Full</div>
            <div style="color: #64748b; font-size: 0.875rem;">9999px</div>
          </div>
        </div>
      </div>
    `,
  }),
};
