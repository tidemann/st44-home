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

/** Monday of the date's week, at noon */
function mondayOf(date: Date): Date {
  // Use local calendar dates at noon so a midnight daylight-saving change cannot shift a day.
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - ((date.getDay() + 6) % 7),
    12,
  );
}

/** The ISO week number: weeks start on Monday, and week 1 holds the year's first Thursday */
export function isoWeek(date: Date): number {
  const monday = mondayOf(date);
  const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3, 12);
  const januaryFourth = new Date(thursday.getFullYear(), 0, 4, 12);
  const firstThursday = new Date(
    thursday.getFullYear(),
    0,
    4 + (4 - (januaryFourth.getDay() || 7)),
    12,
  );
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

/** Fremgang's sub-line: «uke 42 – 12. til 18. oktober» */
export function weekSubline(date: Date): string {
  const monday = mondayOf(date);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12);
  const week = isoWeek(date);
  const range =
    monday.getMonth() === sunday.getMonth()
      ? `${monday.getDate()}. til ${sunday.getDate()}. ${months[sunday.getMonth()]}`
      : `${monday.getDate()}. ${months[monday.getMonth()]} til ${sunday.getDate()}. ${months[sunday.getMonth()]}`;
  return $localize`:@@progress.weekSubline:uke ${week}:week: – ${range}:range:`;
}
