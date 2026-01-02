import type { Meta, StoryObj } from '@storybook/angular';
import { PageComponent } from './page';

/**
 * Page Component
 *
 * Provides consistent layout structure for parent/admin pages with:
 * - Configurable header (gradient or plain)
 * - Automatic responsive container widths
 * - Content projection for header actions and main content
 *
 * ## Usage
 * Wrap page content with `<app-page>` to get consistent layout:
 * ```html
 * <app-page title="Tasks" subtitle="Manage your tasks">
 *   <!-- Your page content -->
 * </app-page>
 * ```
 *
 * ## Header Actions
 * Add buttons to the header using the `page-actions` slot:
 * ```html
 * <app-page title="Rewards">
 *   <ng-container page-actions>
 *     <button>Add Reward</button>
 *   </ng-container>
 *   <!-- Content -->
 * </app-page>
 * ```
 */
const meta: Meta<PageComponent> = {
  title: 'Components/Page',
  component: PageComponent,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Page title displayed in header (required)',
    },
    subtitle: {
      control: 'text',
      description: 'Optional subtitle below the title',
    },
    showGradient: {
      control: 'boolean',
      description: 'Show gradient header background',
    },
    maxWidth: {
      control: 'select',
      options: ['narrow', 'medium', 'wide'],
      description: 'Maximum content width (600px, 800px, 1200px)',
    },
    showHeader: {
      control: 'boolean',
      description: 'Show the header section',
    },
  },
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'app',
      values: [{ name: 'app', value: '#F8F9FF' }],
    },
  },
};

export default meta;
type Story = StoryObj<PageComponent>;

// Sample content for stories
const sampleContent = `
  <div style="background: white; border-radius: 24px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <h2 style="font-family: 'Fredoka', sans-serif; margin: 0 0 16px 0; font-size: 20px;">Content Section</h2>
    <p style="color: #64748b; line-height: 1.5; margin: 0;">
      This is sample page content. The Page component provides consistent layout
      with a configurable header and responsive container widths.
    </p>
  </div>
`;

/**
 * Default page with gradient header
 *
 * The most common page style with the brand gradient header.
 * Used for main pages like Family, Settings, Rewards.
 */
export const Default: Story = {
  args: {
    title: 'Tasks',
    subtitle: "Manage your family's tasks",
    showGradient: true,
    maxWidth: 'medium',
    showHeader: true,
  },
  render: (args) => ({
    props: args,
    template: `
      <app-page
        [title]="title"
        [subtitle]="subtitle"
        [showGradient]="showGradient"
        [maxWidth]="maxWidth"
        [showHeader]="showHeader"
      >
        ${sampleContent}
      </app-page>
    `,
  }),
};

/**
 * Plain header (no gradient)
 *
 * Used for secondary pages or when a simpler header is preferred.
 * White background with subtle border.
 */
export const PlainHeader: Story = {
  args: {
    title: 'All Tasks',
    showGradient: false,
    maxWidth: 'medium',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-page
        [title]="title"
        [showGradient]="showGradient"
        [maxWidth]="maxWidth"
      >
        ${sampleContent}
      </app-page>
    `,
  }),
};

/**
 * With header actions
 *
 * Demonstrates the page-actions slot for adding buttons to the header.
 * Actions appear on the right side of the header.
 */
export const WithActions: Story = {
  args: {
    title: 'Rewards',
    subtitle: 'Create and manage rewards for your family',
    showGradient: true,
    maxWidth: 'wide',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-page
        [title]="title"
        [subtitle]="subtitle"
        [showGradient]="showGradient"
        [maxWidth]="maxWidth"
      >
        <ng-container page-actions>
          <button style="
            background: white;
            color: #6366f1;
            border: none;
            padding: 10px 20px;
            border-radius: 16px;
            font-weight: 600;
            font-family: 'Outfit', sans-serif;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          ">+ Add Reward</button>
        </ng-container>
        ${sampleContent}
      </app-page>
    `,
  }),
};

/**
 * Narrow width
 *
 * Used for form-heavy pages like Settings or Edit Profile.
 * Maximum width of 600px keeps forms readable.
 */
export const NarrowWidth: Story = {
  args: {
    title: 'Edit Profile',
    subtitle: 'Update your account settings',
    showGradient: true,
    maxWidth: 'narrow',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-page
        [title]="title"
        [subtitle]="subtitle"
        [showGradient]="showGradient"
        [maxWidth]="maxWidth"
      >
        <div style="background: white; border-radius: 24px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1e293b;">Name</label>
            <input type="text" value="John Doe" style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 16px; font-size: 15px;" />
          </div>
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1e293b;">Email</label>
            <input type="email" value="john@example.com" style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 16px; font-size: 15px;" />
          </div>
        </div>
      </app-page>
    `,
  }),
};

/**
 * Wide width
 *
 * Used for dashboard pages with multiple columns like Family or Progress.
 * Maximum width of 1200px for better use of screen space.
 */
export const WideWidth: Story = {
  args: {
    title: 'Family',
    subtitle: 'Your household members',
    showGradient: true,
    maxWidth: 'wide',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-page
        [title]="title"
        [subtitle]="subtitle"
        [showGradient]="showGradient"
        [maxWidth]="maxWidth"
      >
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          <div style="background: white; border-radius: 24px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px;">Alex</div>
            <div style="color: #64748b;">Parent</div>
          </div>
          <div style="background: white; border-radius: 24px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px;">Emma</div>
            <div style="color: #64748b;">Child</div>
          </div>
          <div style="background: white; border-radius: 24px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px;">Noah</div>
            <div style="color: #64748b;">Child</div>
          </div>
        </div>
      </app-page>
    `,
  }),
};

/**
 * No header
 *
 * For pages that need custom headers or no header at all.
 * The page provides only the content container.
 */
export const NoHeader: Story = {
  args: {
    title: 'Progress',
    showHeader: false,
    maxWidth: 'wide',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-page
        [title]="title"
        [showHeader]="showHeader"
        [maxWidth]="maxWidth"
      >
        <div style="background: linear-gradient(135deg, #6366f1, #ec4899); border-radius: 24px; padding: 32px; color: white; margin-bottom: 16px;">
          <h1 style="font-family: 'Fredoka', sans-serif; font-size: 28px; margin: 0 0 8px 0;">Custom Header</h1>
          <p style="margin: 0; opacity: 0.9;">Pages can provide their own header when showHeader is false.</p>
        </div>
        ${sampleContent}
      </app-page>
    `,
  }),
};

/**
 * Mobile viewport
 *
 * Shows responsive behavior on mobile devices.
 * Header padding and font sizes adjust automatically.
 */
export const Mobile: Story = {
  args: {
    title: 'Tasks',
    subtitle: "Today's tasks",
    showGradient: true,
    maxWidth: 'medium',
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: (args) => ({
    props: args,
    template: `
      <app-page
        [title]="title"
        [subtitle]="subtitle"
        [showGradient]="showGradient"
        [maxWidth]="maxWidth"
      >
        ${sampleContent}
      </app-page>
    `,
  }),
};

/**
 * Accessibility testing
 *
 * Verifies the component meets accessibility requirements:
 * - Semantic h1 for page title
 * - main element for content
 * - Proper color contrast
 */
export const Accessibility: Story = {
  args: {
    title: 'Accessible Page',
    subtitle: 'Testing accessibility features',
    showGradient: true,
    maxWidth: 'medium',
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'heading-order', enabled: true },
          { id: 'landmark-main-is-top-level', enabled: true },
        ],
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `
      <app-page
        [title]="title"
        [subtitle]="subtitle"
        [showGradient]="showGradient"
        [maxWidth]="maxWidth"
      >
        ${sampleContent}
      </app-page>
    `,
  }),
};
