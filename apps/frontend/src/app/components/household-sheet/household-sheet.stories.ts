import { Meta, StoryObj } from '@storybook/angular';
import { HouseholdSheet } from './household-sheet';
import type { HouseholdListItem } from '../../services/household.service';

const household = (id: string, name: string, memberCount: number): HouseholdListItem => ({
  id,
  name,
  createdAt: '2026-10-01',
  updatedAt: '2026-10-01',
  role: 'admin',
  memberCount,
});

const two = [household('a', 'Familien Dahl', 5), household('b', 'Hytta på Geilo', 4)];

/**
 * «Bytt husstand» (ST-1065): the bottom sheet behind the «⌄» in the home title, shown only with
 * 2 or more households. One row per household, «Valgt nå» on the chosen one, and «Administrer
 * husstander» under the list. It blocks: the 30 % ink veil, Escape and a tap on the veil close it.
 *
 * Part of the Diddit! Design System - see the guide, The household name as the home title.
 */
const meta: Meta<HouseholdSheet> = {
  title: 'Components/HouseholdSheet',
  component: HouseholdSheet,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean', description: 'Shows the sheet and the veil' },
    households: { control: 'object', description: 'Every household the person belongs to' },
    activeId: { control: 'text', description: "The chosen household's id" },
    activeDay: {
      control: 'text',
      description: "The chosen household's day, «3 av 7 gjort i dag»; null leaves it out",
    },
    pick: { action: 'pick', description: 'Another household was tapped' },
    manage: { action: 'manage', description: '«Administrer husstander»' },
    closed: { action: 'closed', description: 'Escape, the veil, or the chosen row' },
  },
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
};

export default meta;

type Story = StoryObj<HouseholdSheet>;

/** Two households, as drawn: the chosen one carries today's count */
export const Default: Story = {
  args: { open: true, households: two, activeId: 'a', activeDay: '3 av 7 gjort i dag' },
};

/** The chosen household has no chores today */
export const NoChoresToday: Story = {
  args: { open: true, households: two, activeId: 'a', activeDay: 'ingen oppgaver i dag' },
};

/** Three households and a long name that wraps */
export const LongNames: Story = {
  args: {
    open: true,
    households: [
      household('a', 'Hytta på Geilo og Familien Dahl-Pettersen', 7),
      household('b', 'Familien Dahl', 5),
      household('c', 'Besteforeldrene på Hamar', 1),
    ],
    activeId: 'a',
    activeDay: '2 av 9 gjort i dag',
  },
};

/** Closed: renders nothing */
export const Closed: Story = {
  args: { open: false, households: two, activeId: 'a', activeDay: null },
};
