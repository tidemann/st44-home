import { Meta, StoryObj, applicationConfig } from '@storybook/angular';
import { inject, provideAppInitializer } from '@angular/core';
import { ConfirmDialog } from './confirm-dialog';
import { ConfirmDialogService, ConfirmRequest } from '../../../services/confirm-dialog.service';

/**
 * The Diddit confirm dialog (guide: Popups, ST-880). Replaces the browser's confirm(): a blocking
 * popup with the ink edge and the 30 % ink veil, «Avbryt» outlined on the left, the answer that
 * acts filled on the right — Overdue Rust when it destroys something.
 */
const ask = (request: ConfirmRequest) => [
  applicationConfig({
    providers: [
      provideAppInitializer(() => {
        void inject(ConfirmDialogService).confirm(request);
      }),
    ],
  }),
];

const meta: Meta<ConfirmDialog> = {
  title: 'Components/Modals/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' },
  },
};

export default meta;
type Story = StoryObj<ConfirmDialog>;

/** «Slette oppgaven?» as drawn in popup-02, with the approved rust «Slett» */
export const DeleteTask: Story = {
  decorators: ask({
    title: 'Slette oppgaven?',
    message: '«Søppel og pant ut» forsvinner for hele familien. Poeng som alt er gitt, blir stående.',
    confirmLabel: 'Slett',
    danger: true,
  }),
};

/** A question that does not destroy anything: the act button takes the yellow primary */
export const AcceptInvitation: Story = {
  decorators: ask({
    title: 'Bli med i husstanden?',
    message: 'Du blir med i «Hjemme» som forelder.',
    confirmLabel: 'Bli med',
  }),
};

/** A longer label wraps inside its button; the row stacks when two no longer fit */
export const LongLabel: Story = {
  decorators: ask({
    title: 'Rydde i invitasjonene?',
    message: 'Alle tilbaketrukne, avslåtte og utløpte invitasjoner fjernes fra listen.',
    confirmLabel: 'Ja, fjern alle gamle invitasjoner nå',
    cancelLabel: 'Ikke nå, spør meg senere',
    danger: true,
  }),
};
