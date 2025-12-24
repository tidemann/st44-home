import type { Meta, StoryObj } from '@storybook/angular';

const meta: Meta = {
  title: 'Design System/Typography',
  tags: ['autodocs'],
};

export default meta;

export const Fonts: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 2rem;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 2rem;">Typography System</h1>

        <div style="display: grid; gap: 3rem;">
          <!-- Font Families -->
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Font Families</h2>
            <div style="display: grid; gap: 1.5rem;">
              <div style="background: #F8FAFC; padding: 1.5rem; border-radius: 8px;">
                <div style="font-family: 'Fredoka', system-ui; font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">
                  Fredoka - Heading Font
                </div>
                <div style="color: #64748b; font-size: 0.875rem; font-family: system-ui;">
                  Used for headings (H1-H6), page titles, and emphasis
                </div>
                <div style="color: #64748b; font-size: 0.875rem; font-family: system-ui; margin-top: 0.5rem;">
                  Weights: 400 (Regular), 600 (Semibold), 700 (Bold)
                </div>
              </div>

              <div style="background: #F8FAFC; padding: 1.5rem; border-radius: 8px;">
                <div style="font-family: 'Outfit', system-ui; font-size: 1.5rem; margin-bottom: 0.5rem;">
                  Outfit - Body Font
                </div>
                <div style="color: #64748b; font-size: 0.875rem; font-family: system-ui;">
                  Used for body text, paragraphs, labels, and UI elements
                </div>
                <div style="color: #64748b; font-size: 0.875rem; font-family: system-ui; margin-top: 0.5rem;">
                  Weights: 400 (Regular), 500 (Medium), 600 (Semibold)
                </div>
              </div>
            </div>
          </div>

          <!-- Heading Sizes -->
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Heading Sizes</h2>
            <div style="display: grid; gap: 1rem;">
              <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 1rem;">
                <h1 style="font-family: 'Fredoka', system-ui; font-size: 48px; font-weight: 700; margin: 0;">
                  Heading 1 - 48px Bold
                </h1>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.5rem;">
                  Page titles, hero sections
                </div>
              </div>

              <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 1rem;">
                <h2 style="font-family: 'Fredoka', system-ui; font-size: 36px; font-weight: 600; margin: 0;">
                  Heading 2 - 36px Semibold
                </h2>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.5rem;">
                  Section titles
                </div>
              </div>

              <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 1rem;">
                <h3 style="font-family: 'Fredoka', system-ui; font-size: 30px; font-weight: 600; margin: 0;">
                  Heading 3 - 30px Semibold
                </h3>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.5rem;">
                  Subsection titles
                </div>
              </div>

              <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 1rem;">
                <h4 style="font-family: 'Fredoka', system-ui; font-size: 24px; font-weight: 600; margin: 0;">
                  Heading 4 - 24px Semibold
                </h4>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.5rem;">
                  Card titles, component headers
                </div>
              </div>

              <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 1rem;">
                <h5 style="font-family: 'Fredoka', system-ui; font-size: 20px; font-weight: 600; margin: 0;">
                  Heading 5 - 20px Semibold
                </h5>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.5rem;">
                  Small section titles
                </div>
              </div>

              <div style="padding-bottom: 1rem;">
                <h6 style="font-family: 'Fredoka', system-ui; font-size: 16px; font-weight: 600; margin: 0;">
                  Heading 6 - 16px Semibold
                </h6>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.5rem;">
                  List titles, small emphasis
                </div>
              </div>
            </div>
          </div>

          <!-- Body Text Sizes -->
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Body Text Sizes</h2>
            <div style="display: grid; gap: 1rem;">
              <div style="background: #F8FAFC; padding: 1rem; border-radius: 8px;">
                <div style="font-family: 'Outfit', system-ui; font-size: 18px; line-height: 1.6;">
                  Large - 18px Regular (1.6 line height)
                </div>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.5rem;">
                  Introductory paragraphs, emphasis text
                </div>
              </div>

              <div style="background: #F8FAFC; padding: 1rem; border-radius: 8px;">
                <div style="font-family: 'Outfit', system-ui; font-size: 16px; line-height: 1.5;">
                  Base - 16px Regular (1.5 line height)
                </div>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.5rem;">
                  Default body text, paragraphs, descriptions
                </div>
              </div>

              <div style="background: #F8FAFC; padding: 1rem; border-radius: 8px;">
                <div style="font-family: 'Outfit', system-ui; font-size: 14px; line-height: 1.5;">
                  Small - 14px Regular (1.5 line height)
                </div>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.5rem;">
                  Secondary text, labels, hints
                </div>
              </div>

              <div style="background: #F8FAFC; padding: 1rem; border-radius: 8px;">
                <div style="font-family: 'Outfit', system-ui; font-size: 12px; line-height: 1.4;">
                  Extra Small - 12px Regular (1.4 line height)
                </div>
                <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.5rem;">
                  Captions, metadata, fine print
                </div>
              </div>
            </div>
          </div>

          <!-- Font Weights -->
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Font Weights</h2>
            <div style="display: grid; gap: 1rem;">
              <div style="background: #F8FAFC; padding: 1rem; border-radius: 8px;">
                <div style="font-family: 'Outfit', system-ui; font-size: 16px; font-weight: 400;">
                  Regular (400) - Default body text
                </div>
              </div>

              <div style="background: #F8FAFC; padding: 1rem; border-radius: 8px;">
                <div style="font-family: 'Outfit', system-ui; font-size: 16px; font-weight: 500;">
                  Medium (500) - Slightly emphasized text
                </div>
              </div>

              <div style="background: #F8FAFC; padding: 1rem; border-radius: 8px;">
                <div style="font-family: 'Outfit', system-ui; font-size: 16px; font-weight: 600;">
                  Semibold (600) - Strong emphasis, buttons
                </div>
              </div>

              <div style="background: #F8FAFC; padding: 1rem; border-radius: 8px;">
                <div style="font-family: 'Fredoka', system-ui; font-size: 16px; font-weight: 700;">
                  Bold (700) - Headings, very strong emphasis
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
  }),
};

export const Example: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 2rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-family: 'Fredoka', system-ui; font-size: 48px; font-weight: 700; margin-bottom: 1rem;">
          Welcome to Our App
        </h1>

        <p style="font-family: 'Outfit', system-ui; font-size: 18px; line-height: 1.6; color: #475569; margin-bottom: 2rem;">
          This is an example of how our typography system works together. The heading uses Fredoka Bold,
          while this introductory paragraph uses Outfit Regular at 18px.
        </p>

        <h2 style="font-family: 'Fredoka', system-ui; font-size: 36px; font-weight: 600; margin-bottom: 1rem;">
          Getting Started
        </h2>

        <p style="font-family: 'Outfit', system-ui; font-size: 16px; line-height: 1.5; color: #475569; margin-bottom: 1rem;">
          Regular body text uses Outfit at 16px with a comfortable 1.5 line height. This ensures
          excellent readability across all devices.
        </p>

        <h3 style="font-family: 'Fredoka', system-ui; font-size: 24px; font-weight: 600; margin-bottom: 0.75rem; margin-top: 2rem;">
          Features
        </h3>

        <ul style="font-family: 'Outfit', system-ui; font-size: 16px; line-height: 1.5; color: #475569; padding-left: 1.5rem;">
          <li>Clean, modern typography</li>
          <li>Excellent contrast and readability</li>
          <li>Consistent spacing and hierarchy</li>
        </ul>

        <div style="background: #F8FAFC; padding: 1rem; border-radius: 8px; border-left: 4px solid #6366F1; margin-top: 2rem;">
          <p style="font-family: 'Outfit', system-ui; font-size: 14px; line-height: 1.5; color: #64748b; margin: 0;">
            This is a note using smaller text (14px) in a slightly lighter color for secondary information.
          </p>
        </div>
      </div>
    `,
  }),
};
