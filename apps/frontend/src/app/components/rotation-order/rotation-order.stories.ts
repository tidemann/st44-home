import type { Meta, StoryObj } from '@storybook/angular';
import type { Child } from '@st44/types';
import { RotationOrder } from './rotation-order';

const child = (id: string, name: string): Child => ({
  id,
  householdId: 'h1',
  name,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const kids = [child('emma', 'Emma'), child('jonas', 'Jonas'), child('mathea', 'Mathea')];

/**
 * The weekly rotation list of the task popup (ST-2030), as signed off on ST-2028.
 *
 * One row per child. A tick puts the child in; the order of the ticked rows is the rotation
 * order. Drag the handle (or long-press the row on a phone) to change it; press the handle
 * for the arrows when dragging is not possible. Odd/even only with exactly two children.
 */
const meta: Meta<RotationOrder> = {
  title: 'Components/RotationOrder',
  component: RotationOrder,
  tags: ['autodocs'],
  argTypes: {
    children: { control: 'object', description: 'Every child in the household' },
    order: { control: 'object', description: 'Ticked child ids in rotation order' },
    oddEven: { control: 'boolean', description: 'Odd/even switch (counts with two children)' },
    startsNextWeek: {
      control: 'boolean',
      description: 'Edit: a changed order starts next week, row 1 is next week',
    },
    thisWeekName: { control: 'text', description: 'Edit: who has this week and keeps it' },
    showError: { control: 'boolean', description: '«Legg til» pressed with fewer than two' },
    today: { control: 'date', description: 'Today, for the week numbers' },
    orderChange: { action: 'orderChange' },
    oddEvenChange: { action: 'oddEvenChange' },
  },
  args: {
    children: kids,
    // Wednesday of week 45, as in the picture
    today: new Date(2026, 10, 4, 12),
    oddEven: false,
    startsNextWeek: false,
    thisWeekName: null,
    showError: false,
  },
  decorators: [
    () => ({
      template: `<div style="width: 313px; padding: 16px; background: #fff;"><story /></div>`,
    }),
  ],
};

export default meta;
type Story = StoryObj<RotationOrder>;

/** 1 — Bytter hver uke, two children; Mathea is not in */
export const TwoChildren: Story = { args: { order: ['emma', 'jonas'] } };

/** 2 — Oddetall/partall, two children */
export const OddEven: Story = { args: { order: ['emma', 'jonas'], oddEven: true } };

/** 3 — Three children: odd/even is off and says why */
export const ThreeChildren: Story = { args: { order: ['emma', 'jonas', 'mathea'] } };

/** Edit: rows start next week; this week keeps Jonas */
export const EditStartsNextWeek: Story = {
  args: { order: ['mathea', 'emma', 'jonas'], startsNextWeek: true, thisWeekName: 'Jonas' },
};

/** One ticked: no handle, the reason under the list */
export const OneTicked: Story = { args: { order: ['emma'] } };

/** After «Legg til» with fewer than two */
export const ErrorAfterSubmit: Story = { args: { order: ['emma'], showError: true } };

/** Worst case: four children, a 35-character name, a one-letter name */
export const LongNames: Story = {
  args: {
    children: [
      child('max', 'Maximiliane-Sofie Nordmoen-Bakketun'),
      child('o', 'Ø'),
      child('jonas', 'Jonas'),
      child('mathea', 'Mathea'),
    ],
    order: ['max', 'o', 'jonas'],
  },
};

/** Over the year end: weeks 53, 1, 2 */
export const YearEnd: Story = {
  args: { order: ['emma', 'jonas', 'mathea'], today: new Date(2026, 11, 30, 12) },
};
