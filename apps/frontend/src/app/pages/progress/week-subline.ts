const months = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
];

export function weekSubline(date: Date): string {
  // Use local calendar dates at noon so a midnight daylight-saving change cannot shift a day.
  const monday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - ((date.getDay() + 6) % 7),
    12,
  );
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12);
  const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3, 12);
  const januaryFourth = new Date(thursday.getFullYear(), 0, 4, 12);
  const firstThursday = new Date(
    thursday.getFullYear(),
    0,
    4 + (4 - (januaryFourth.getDay() || 7)),
    12,
  );
  const week =
    1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const range =
    monday.getMonth() === sunday.getMonth()
      ? `${monday.getDate()}. til ${sunday.getDate()}. ${months[sunday.getMonth()]}`
      : `${monday.getDate()}. ${months[monday.getMonth()]} til ${sunday.getDate()}. ${months[sunday.getMonth()]}`;
  return $localize`:@@progress.weekSubline:uke ${week}:week: – ${range}:range:`;
}
