/** «jonas.nordmann@gmail.com» → «jo•••@gmail.com». Shown to whoever holds an invitation link. */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return '•••';

  const local = trimmed.slice(0, at);
  return `${local.slice(0, local.length <= 2 ? 1 : 2)}•••@${trimmed.slice(at + 1)}`;
}
