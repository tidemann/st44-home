import type { Meta, StoryObj } from '@storybook/angular';

const meta: Meta = {
  title: 'Design System/Colors',
  tags: ['autodocs'],
};

export default meta;

export const Primary: StoryObj = {
  render: () => ({
    template: `
      <div style="font-family: var(--font-body, system-ui); padding: 2rem;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 2rem;">Color Palette</h1>

        <div style="display: grid; gap: 2rem;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Primary Colors</h2>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <div style="min-width: 200px;">
                <div style="width: 200px; height: 150px; background: #6366F1; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div style="margin-top: 0.5rem;">
                  <div style="font-weight: 600; font-size: 1.125rem;">Primary</div>
                  <div style="color: #64748b; font-size: 0.875rem;">#6366F1</div>
                  <div style="color: #64748b; font-size: 0.875rem;">Indigo 500</div>
                </div>
              </div>

              <div style="min-width: 200px;">
                <div style="width: 200px; height: 150px; background: #EC4899; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div style="margin-top: 0.5rem;">
                  <div style="font-weight: 600; font-size: 1.125rem;">Secondary</div>
                  <div style="color: #64748b; font-size: 0.875rem;">#EC4899</div>
                  <div style="color: #64748b; font-size: 0.875rem;">Pink 500</div>
                </div>
              </div>

              <div style="min-width: 200px;">
                <div style="width: 200px; height: 150px; background: #10B981; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div style="margin-top: 0.5rem;">
                  <div style="font-weight: 600; font-size: 1.125rem;">Success</div>
                  <div style="color: #64748b; font-size: 0.875rem;">#10B981</div>
                  <div style="color: #64748b; font-size: 0.875rem;">Emerald 500</div>
                </div>
              </div>

              <div style="min-width: 200px;">
                <div style="width: 200px; height: 150px; background: #EF4444; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div style="margin-top: 0.5rem;">
                  <div style="font-weight: 600; font-size: 1.125rem;">Danger</div>
                  <div style="color: #64748b; font-size: 0.875rem;">#EF4444</div>
                  <div style="color: #64748b; font-size: 0.875rem;">Red 500</div>
                </div>
              </div>

              <div style="min-width: 200px;">
                <div style="width: 200px; height: 150px; background: #F59E0B; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div style="margin-top: 0.5rem;">
                  <div style="font-weight: 600; font-size: 1.125rem;">Warning</div>
                  <div style="color: #64748b; font-size: 0.875rem;">#F59E0B</div>
                  <div style="color: #64748b; font-size: 0.875rem;">Amber 500</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Neutral Colors</h2>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <div style="min-width: 200px;">
                <div style="width: 200px; height: 150px; background: #0F172A; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div style="margin-top: 0.5rem;">
                  <div style="font-weight: 600; font-size: 1.125rem;">Slate 900</div>
                  <div style="color: #64748b; font-size: 0.875rem;">#0F172A</div>
                  <div style="color: #64748b; font-size: 0.875rem;">Dark text</div>
                </div>
              </div>

              <div style="min-width: 200px;">
                <div style="width: 200px; height: 150px; background: #1E293B; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div style="margin-top: 0.5rem;">
                  <div style="font-weight: 600; font-size: 1.125rem;">Slate 800</div>
                  <div style="color: #64748b; font-size: 0.875rem;">#1E293B</div>
                  <div style="color: #64748b; font-size: 0.875rem;">Dark background</div>
                </div>
              </div>

              <div style="min-width: 200px;">
                <div style="width: 200px; height: 150px; background: #64748B; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div style="margin-top: 0.5rem;">
                  <div style="font-weight: 600; font-size: 1.125rem;">Slate 500</div>
                  <div style="color: #64748b; font-size: 0.875rem;">#64748B</div>
                  <div style="color: #64748b; font-size: 0.875rem;">Secondary text</div>
                </div>
              </div>

              <div style="min-width: 200px;">
                <div style="width: 200px; height: 150px; background: #E2E8F0; border-radius: 8px; border: 1px solid #CBD5E1; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div style="margin-top: 0.5rem;">
                  <div style="font-weight: 600; font-size: 1.125rem;">Slate 200</div>
                  <div style="color: #64748b; font-size: 0.875rem;">#E2E8F0</div>
                  <div style="color: #64748b; font-size: 0.875rem;">Light background</div>
                </div>
              </div>

              <div style="min-width: 200px;">
                <div style="width: 200px; height: 150px; background: #F8F9FF; border-radius: 8px; border: 1px solid #E2E8F0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div style="margin-top: 0.5rem;">
                  <div style="font-weight: 600; font-size: 1.125rem;">Background</div>
                  <div style="color: #64748b; font-size: 0.875rem;">#F8F9FF</div>
                  <div style="color: #64748b; font-size: 0.875rem;">Page background</div>
                </div>
              </div>

              <div style="min-width: 200px;">
                <div style="width: 200px; height: 150px; background: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div style="margin-top: 0.5rem;">
                  <div style="font-weight: 600; font-size: 1.125rem;">White</div>
                  <div style="color: #64748b; font-size: 0.875rem;">#FFFFFF</div>
                  <div style="color: #64748b; font-size: 0.875rem;">Card background</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Usage Guidelines</h2>
            <div style="background: #F8FAFC; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #6366F1;">
              <p style="margin: 0 0 1rem 0; color: #475569;">
                <strong>Primary:</strong> Main actions, links, and interactive elements
              </p>
              <p style="margin: 0 0 1rem 0; color: #475569;">
                <strong>Secondary:</strong> Secondary actions and accent elements
              </p>
              <p style="margin: 0 0 1rem 0; color: #475569;">
                <strong>Success:</strong> Positive feedback, completed states
              </p>
              <p style="margin: 0 0 1rem 0; color: #475569;">
                <strong>Danger:</strong> Errors, destructive actions, warnings
              </p>
              <p style="margin: 0; color: #475569;">
                <strong>Warning:</strong> Cautions, important notifications
              </p>
            </div>
          </div>
        </div>
      </div>
    `,
  }),
};

export const AllShades: StoryObj = {
  render: () => ({
    template: `
      <div style="font-family: var(--font-body, system-ui); padding: 2rem;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 2rem;">Color Shades</h1>

        <div style="display: grid; gap: 1.5rem;">
          <!-- Indigo -->
          <div>
            <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Indigo (Primary)</h3>
            <div style="display: flex; gap: 0.5rem; overflow-x: auto;">
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #EEF2FF; border-radius: 4px; border: 1px solid #E0E7FF;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">50</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #E0E7FF; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">100</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #C7D2FE; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">200</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #A5B4FC; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">300</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #818CF8; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">400</div>
              </div>
              <div style="min-width: 80px; text-align: center; border: 2px solid #6366F1; padding: -2px;">
                <div style="width: 80px; height: 80px; background: #6366F1; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem; font-weight: 600;">500</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #4F46E5; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">600</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #4338CA; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">700</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #3730A3; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">800</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #312E81; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">900</div>
              </div>
            </div>
          </div>

          <!-- Slate -->
          <div>
            <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Slate (Neutral)</h3>
            <div style="display: flex; gap: 0.5rem; overflow-x: auto;">
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #F8FAFC; border-radius: 4px; border: 1px solid #F1F5F9;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">50</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #F1F5F9; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">100</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #E2E8F0; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">200</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #CBD5E1; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">300</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #94A3B8; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">400</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #64748B; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">500</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #475569; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">600</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #334155; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">700</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #1E293B; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">800</div>
              </div>
              <div style="min-width: 80px; text-align: center;">
                <div style="width: 80px; height: 80px; background: #0F172A; border-radius: 4px;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem;">900</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
  }),
};
