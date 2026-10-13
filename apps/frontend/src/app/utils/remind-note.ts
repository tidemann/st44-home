/** What happened to «Minn på» for one chore (ST-951, option C approved on ST-1066) */
export type RemindState = { status: 'sent'; at: Date } | { status: 'failed' };

/** The line under the row: «Påminnelse sendt 16.49» (Done Green) or «Påminnelsen gikk ikke gjennom» (rust) */
export function remindNote(
  state: RemindState | undefined,
): { text: string; tone: 'done' | 'overdue' } | null {
  if (!state) return null;
  if (state.status === 'failed') {
    return { text: $localize`:@@remindNote.failed:Påminnelsen gikk ikke gjennom`, tone: 'overdue' };
  }

  const time = [state.at.getHours(), state.at.getMinutes()]
    .map((n) => String(n).padStart(2, '0'))
    .join('.');
  return { text: $localize`:@@remindNote.sent:Påminnelse sendt ${time}:time:`, tone: 'done' };
}
