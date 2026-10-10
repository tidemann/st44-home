import { moduleMetadata, type Decorator, type Meta, type StoryObj } from '@storybook/angular';
import { ChildPointsCard } from './child-points-card';

/** One card at its real 109 px width on the page background */
const cardFrame: Decorator = () => ({
  template: `<div style="width: 109px; padding: 16px; background: #f6f6f4; box-sizing: content-box;"><story /></div>`,
});

/**
 * ChildPointsCard shows one child on the family screen: name, points total,
 * "poeng", the green/rust chore meter and "1 av 3 gjort". A child with no
 * chores today reads "Fri i dag". Three cards sit across at 109 px on a
 * 390 px phone.
 *
 * Part of the Diddit! Poeng look - Child card.
 */
const meta: Meta<ChildPointsCard> = {
  title: 'Components/Poeng/ChildPointsCard',
  component: ChildPointsCard,
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'text',
      description: "Child's name (required)",
    },
    points: {
      control: { type: 'number', min: 0, step: 5 },
      description: 'Points total',
    },
    chores: {
      control: 'object',
      description: "Today's chores, one entry each: 'done', 'open' or 'late'",
    },
  },
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
};

export default meta;
type Story = StoryObj<ChildPointsCard>;

/** One of three chores done */
export const InProgress: Story = {
  decorators: [cardFrame],
  args: {
    name: 'Mathea',
    points: 45,
    chores: ['done', 'open', 'open'],
  },
};

/** All chores done today */
export const AllDone: Story = {
  decorators: [cardFrame],
  args: {
    name: 'Jonas',
    points: 120,
    chores: ['done', 'done'],
  },
};

/** Behind: an overdue chore turns the count rust */
export const Behind: Story = {
  decorators: [cardFrame],
  args: {
    name: 'Emil',
    points: 10,
    chores: ['late', 'done', 'open'],
  },
};

/** No chores today */
export const FreeToday: Story = {
  decorators: [cardFrame],
  args: {
    name: 'Sofie',
    points: 30,
    chores: [],
  },
};

/** New child with no points yet */
export const ZeroPoints: Story = {
  decorators: [cardFrame],
  args: {
    name: 'Ola',
    points: 0,
    chores: ['open', 'open'],
  },
};

/** A long name is cut with an ellipsis */
export const LongName: Story = {
  decorators: [cardFrame],
  args: {
    name: 'Marie-Louise Kristiansen',
    points: 1250,
    chores: ['done', 'done', 'open', 'late'],
  },
};

/** Three children across, as on the family screen (342 px column) */
export const ThreeAcross: Story = {
  decorators: [moduleMetadata({ imports: [ChildPointsCard] })],
  render: () => ({
    template: `
      <div style="width: 342px; padding: 24px; background: #f6f6f4; display: grid; grid-template-columns: repeat(3, 1fr); gap: 7.5px;">
        <app-child-points-card name="Mathea" [points]="45" [chores]="['done', 'open', 'open']" />
        <app-child-points-card name="Jonas" [points]="120" [chores]="['done', 'done']" />
        <app-child-points-card name="Emil" [points]="10" [chores]="['late', 'done', 'open']" />
      </div>
    `,
  }),
};
