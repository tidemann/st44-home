import type { Meta, StoryObj } from '@storybook/angular';

const meta: Meta = {
  title: 'Design System/Gradients',
  tags: ['autodocs'],
};

export default meta;

export const Gradients: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 2rem;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 2rem;">Gradient System</h1>

        <div style="display: grid; gap: 2rem;">
          <!-- Primary Gradients -->
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Primary Gradients</h2>
            <div style="display: grid; gap: 1.5rem;">
              <div>
                <div style="height: 150px; background: linear-gradient(135deg, #6366F1 0%, #EC4899 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.25rem;">
                  Primary to Secondary
                </div>
                <div style="margin-top: 0.75rem; color: #64748b; font-size: 0.875rem;">
                  linear-gradient(135deg, #6366F1 0%, #EC4899 100%)
                </div>
              </div>

              <div>
                <div style="height: 150px; background: linear-gradient(135deg, #6366F1 0%, #818CF8 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.25rem;">
                  Indigo Gradient
                </div>
                <div style="margin-top: 0.75rem; color: #64748b; font-size: 0.875rem;">
                  linear-gradient(135deg, #6366F1 0%, #818CF8 100%)
                </div>
              </div>

              <div>
                <div style="height: 150px; background: linear-gradient(135deg, #EC4899 0%, #F9A8D4 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.25rem;">
                  Pink Gradient
                </div>
                <div style="margin-top: 0.75rem; color: #64748b; font-size: 0.875rem;">
                  linear-gradient(135deg, #EC4899 0%, #F9A8D4 100%)
                </div>
              </div>
            </div>
          </div>

          <!-- Accent Gradients -->
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Accent Gradients</h2>
            <div style="display: grid; gap: 1.5rem;">
              <div>
                <div style="height: 150px; background: linear-gradient(135deg, #10B981 0%, #34D399 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.25rem;">
                  Success Gradient
                </div>
                <div style="margin-top: 0.75rem; color: #64748b; font-size: 0.875rem;">
                  linear-gradient(135deg, #10B981 0%, #34D399 100%)
                </div>
              </div>

              <div>
                <div style="height: 150px; background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.25rem;">
                  Warning Gradient
                </div>
                <div style="margin-top: 0.75rem; color: #64748b; font-size: 0.875rem;">
                  linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)
                </div>
              </div>

              <div>
                <div style="height: 150px; background: linear-gradient(135deg, #EF4444 0%, #F87171 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.25rem;">
                  Danger Gradient
                </div>
                <div style="margin-top: 0.75rem; color: #64748b; font-size: 0.875rem;">
                  linear-gradient(135deg, #EF4444 0%, #F87171 100%)
                </div>
              </div>
            </div>
          </div>

          <!-- Subtle Gradients -->
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Subtle Background Gradients</h2>
            <div style="display: grid; gap: 1.5rem;">
              <div>
                <div style="height: 150px; background: linear-gradient(135deg, #F8F9FF 0%, #EEF2FF 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #475569; font-weight: 600; font-size: 1.25rem; border: 1px solid #E2E8F0;">
                  Light Gradient
                </div>
                <div style="margin-top: 0.75rem; color: #64748b; font-size: 0.875rem;">
                  linear-gradient(135deg, #F8F9FF 0%, #EEF2FF 100%)
                </div>
              </div>

              <div>
                <div style="height: 150px; background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.25rem;">
                  Dark Gradient
                </div>
                <div style="margin-top: 0.75rem; color: #64748b; font-size: 0.875rem;">
                  linear-gradient(135deg, #1E293B 0%, #0F172A 100%)
                </div>
              </div>
            </div>
          </div>

          <!-- Gradient Directions -->
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Gradient Directions</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
              <div>
                <div style="height: 120px; background: linear-gradient(0deg, #6366F1 0%, #EC4899 100%); border-radius: 8px;"></div>
                <div style="margin-top: 0.5rem; font-weight: 600;">To Top (0deg)</div>
              </div>

              <div>
                <div style="height: 120px; background: linear-gradient(45deg, #6366F1 0%, #EC4899 100%); border-radius: 8px;"></div>
                <div style="margin-top: 0.5rem; font-weight: 600;">Diagonal (45deg)</div>
              </div>

              <div>
                <div style="height: 120px; background: linear-gradient(90deg, #6366F1 0%, #EC4899 100%); border-radius: 8px;"></div>
                <div style="margin-top: 0.5rem; font-weight: 600;">To Right (90deg)</div>
              </div>

              <div>
                <div style="height: 120px; background: linear-gradient(135deg, #6366F1 0%, #EC4899 100%); border-radius: 8px;"></div>
                <div style="margin-top: 0.5rem; font-weight: 600;">Default (135deg)</div>
              </div>

              <div>
                <div style="height: 120px; background: linear-gradient(180deg, #6366F1 0%, #EC4899 100%); border-radius: 8px;"></div>
                <div style="margin-top: 0.5rem; font-weight: 600;">To Bottom (180deg)</div>
              </div>

              <div>
                <div style="height: 120px; background: radial-gradient(circle, #6366F1 0%, #EC4899 100%); border-radius: 8px;"></div>
                <div style="margin-top: 0.5rem; font-weight: 600;">Radial</div>
              </div>
            </div>
          </div>

          <!-- Usage Guidelines -->
          <div style="background: #F8FAFC; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #6366F1;">
            <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">Usage Guidelines</h2>
            <ul style="color: #475569; padding-left: 1.5rem; margin: 0;">
              <li style="margin-bottom: 0.5rem;">Use gradients sparingly for emphasis and visual interest</li>
              <li style="margin-bottom: 0.5rem;">Prefer 135deg diagonal gradients for consistency</li>
              <li style="margin-bottom: 0.5rem;">Ensure text contrast meets WCAG AA standards (4.5:1)</li>
              <li style="margin-bottom: 0.5rem;">Use subtle gradients for backgrounds, vibrant ones for accents</li>
              <li>Test gradients across different screen sizes and devices</li>
            </ul>
          </div>
        </div>
      </div>
    `,
  }),
};
