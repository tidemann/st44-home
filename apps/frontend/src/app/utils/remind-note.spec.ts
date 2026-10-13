import '@angular/localize/init';
import { describe, it, expect } from 'vitest';
import { remindNote } from './remind-note';

describe('remindNote', () => {
  it('shows a sent reminder with its local time', () => {
    expect(remindNote({ status: 'sent', at: new Date(2026, 9, 12, 16, 49) })).toEqual({
      text: 'Påminnelse sendt 16.49',
      tone: 'done',
    });
  });

  it('pads a single-digit hour and minute', () => {
    expect(remindNote({ status: 'sent', at: new Date(2026, 9, 12, 9, 5) })).toEqual({
      text: 'Påminnelse sendt 09.05',
      tone: 'done',
    });
  });

  it('formats midnight as 00.00', () => {
    expect(remindNote({ status: 'sent', at: new Date(2026, 9, 12, 0, 0) })).toEqual({
      text: 'Påminnelse sendt 00.00',
      tone: 'done',
    });
  });

  it('shows a failed reminder', () => {
    expect(remindNote({ status: 'failed' })).toEqual({
      text: 'Påminnelsen gikk ikke gjennom',
      tone: 'overdue',
    });
  });

  it('shows no line when there is no reminder', () => {
    expect(remindNote(undefined)).toBeNull();
  });
});
