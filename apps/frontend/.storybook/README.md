# Storybook Configuration

This directory contains the Storybook configuration for the Angular 21+ frontend application.

## Files

- `main.ts` - Main Storybook configuration (stories glob, addons, framework settings)
- `preview.ts` - Global decorators, parameters, and Compodoc integration

## Setup

### Dependencies

Add these dependencies to `apps/frontend/package.json`:

```json
{
  "devDependencies": {
    "@compodoc/compodoc": "^1.1.28",
    "@storybook/addon-a11y": "^8.6.0",
    "@storybook/addon-essentials": "^8.6.0",
    "@storybook/addon-interactions": "^8.6.0",
    "@storybook/addon-links": "^8.6.0",
    "@storybook/angular": "^8.6.0",
    "@storybook/blocks": "^8.6.0",
    "@storybook/test": "^8.6.0",
    "storybook": "^8.6.0"
  },
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "storybook:docs": "compodoc -p tsconfig.json -e json -d ."
  }
}
```

### Installation

```bash
cd apps/frontend
npm install
```

## Usage

### Development

```bash
# Generate Compodoc documentation
npm run storybook:docs

# Start Storybook dev server
npm run storybook
# Opens at localhost:6006
```

### Build Static Storybook

```bash
npm run build-storybook
# Output: storybook-static/
```

## Features

### Addons

- **Essentials** - Controls, Actions, Viewport, Backgrounds, Toolbars
- **A11y** - Accessibility testing with axe-core
- **Interactions** - Test user interactions
- **Links** - Link between stories

### Viewports

- Mobile: 375x667px
- Tablet: 768x1024px
- Desktop: 1440x900px

### Backgrounds

- Light: #F8F9FF (default)
- Dark: #1E293B
- White: #FFFFFF

### Compodoc Integration

Automatically generates component documentation from TypeScript/Angular decorators and JSDoc comments.

## Story Organization

```
src/app/
├── components/
│   └── button/
│       ├── button.component.ts
│       └── button.stories.ts       # Component stories
└── stories/
    └── design-system/
        ├── colors.stories.ts        # Design system documentation
        ├── typography.stories.ts
        ├── spacing.stories.ts
        ├── shadows.stories.ts
        └── gradients.stories.ts
```

### Naming Convention

- Components: `Components/Button`, `Components/Cards/TaskCard`
- Pages: `Pages/Home`, `Pages/Auth/Login`
- Design System: `Design System/Colors`, `Design System/Typography`

## Best Practices

### Every Component Story Should Have:

- ✅ Multiple story variants (Default, Disabled, Loading, Error, etc.)
- ✅ All input combinations tested
- ✅ Accessibility testing enabled (a11y addon)
- ✅ Proper argTypes with descriptions
- ✅ tags: ['autodocs'] for automatic documentation
- ✅ JSDoc comments on @Input() and @Output()

### Story Template

```typescript
import type { Meta, StoryObj } from '@storybook/angular';
import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Components/Button',
  component: ButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    // Define all inputs with controls
  },
};

export default meta;
type Story = StoryObj<ButtonComponent>;

export const Default: Story = {
  args: {
    // Default props
  },
};
```

## Troubleshooting

### Compodoc Documentation Missing

Run `npm run storybook:docs` before starting Storybook to generate component documentation.

### Styles Not Loading

Global styles are imported in `preview.ts`. Verify `../src/styles.css` path is correct.

### Hot Reload Not Working

- Restart Storybook
- Clear browser cache
- Check for port conflicts (port 6006)

## References

- [Storybook for Angular](https://storybook.js.org/docs/get-started/frameworks/angular)
- [Writing Stories](https://storybook.js.org/docs/writing-stories)
- [Accessibility Addon](https://storybook.js.org/addons/@storybook/addon-a11y)
- [Compodoc](https://compodoc.app/)
