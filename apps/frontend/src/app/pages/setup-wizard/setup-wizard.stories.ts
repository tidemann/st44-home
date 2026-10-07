import { Meta, StoryObj, applicationConfig } from '@storybook/angular';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SetupWizard } from './setup-wizard';
import { HouseholdService } from '../../services/household.service';
import { ChildrenService } from '../../services/children.service';
import { TaskService } from '../../services/task.service';
import { PushNotificationService } from '../../services/push-notification.service';

/**
 * First-time setup (sketch 07 v2, ST-624). A parent sets up the family alone in
 * four steps: family name, children (with a QR code each), first chores, and
 * reminders (4a asks, 4b shows what was made). One question and one big button
 * per step; the button sits at the bottom of the card.
 */
const meta: Meta<SetupWizard> = {
  title: 'Pages/SetupWizard',
  component: SetupWizard,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        {
          provide: HouseholdService,
          useValue: {
            createHousehold: async (name: string) => ({ id: 'h-1', name }),
            updateHousehold: async (id: string, name: string) => ({ id, name }),
            setActiveHousehold: () => undefined,
          },
        },
        {
          provide: ChildrenService,
          useValue: { createChild: async () => ({ id: 'c-1', name: 'Emma' }) },
        },
        { provide: TaskService, useValue: { createTask: () => of({ id: 't-1' }) } },
        {
          provide: PushNotificationService,
          useValue: {
            state: signal('off'),
            refresh: async () => 'off',
            enable: async () => 'on',
          },
        },
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
  argTypes: {
    startStep: {
      control: 'select',
      options: [1, 2, 3, 4, 5],
      description: 'Step to open on: 1 family, 2 children, 3 chores, 4 reminders, 5 summary',
    },
  },
};

export default meta;
type Story = StoryObj<SetupWizard>;

/** Step 1: the family name */
export const FamilyName: Story = { args: { startStep: 1 } };

/** Step 2: add children; each gets a QR code to sign in with */
export const Children: Story = { args: { startStep: 2 } };

/** Step 3: five suggested chores, three ticked, plus an own chore */
export const FirstChores: Story = { args: { startStep: 3 } };

/** Step 4a: turn on reminders, or skip */
export const Reminders: Story = { args: { startStep: 4 } };

/** Step 4b: what was made, above the one button "Gå til Hjem" */
export const Summary: Story = { args: { startStep: 5 } };
