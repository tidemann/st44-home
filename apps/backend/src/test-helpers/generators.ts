/**
 * Test Data Generators
 *
 * Functions to generate random test data with realistic values.
 * Reduces hardcoded test data and makes tests more robust.
 */

/**
 * Generate random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random element from array
 */
export function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

/**
 * Generate random string of specified length
 */
export function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomInt(0, chars.length - 1)];
  }
  return result;
}

/**
 * Generate random UUID (v4 format)
 */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate random email address
 */
export function randomEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Generate random password meeting requirements
 */
export function randomPassword(length = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password = '';
  // Ensure at least one of each required character type
  password += uppercase[randomInt(0, uppercase.length - 1)];
  password += lowercase[randomInt(0, lowercase.length - 1)];
  password += numbers[randomInt(0, numbers.length - 1)];
  password += special[randomInt(0, special.length - 1)];

  // Fill the rest with random characters
  const allChars = lowercase + uppercase + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[randomInt(0, allChars.length - 1)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Generate random name (first or last)
 */
export function randomName(type: 'first' | 'last' = 'first'): string {
  const firstNames = [
    'Emma',
    'Liam',
    'Olivia',
    'Noah',
    'Ava',
    'William',
    'Sophia',
    'James',
    'Isabella',
    'Logan',
    'Mia',
    'Benjamin',
    'Charlotte',
    'Mason',
    'Amelia',
    'Ethan',
    'Harper',
    'Lucas',
    'Evelyn',
    'Alexander',
  ];

  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Anderson',
    'Taylor',
    'Thomas',
    'Moore',
    'Jackson',
    'Martin',
    'Lee',
    'Thompson',
    'White',
    'Harris',
  ];

  return type === 'first' ? randomElement(firstNames) : randomElement(lastNames);
}

/**
 * Generate random full name
 */
export function randomFullName(): string {
  return `${randomName('first')} ${randomName('last')}`;
}

/**
 * Generate random age within a range
 */
export function randomAge(min = 5, max = 18): number {
  return randomInt(min, max);
}

/**
 * Generate random birth year for children
 */
export function randomBirthYear(currentYear = new Date().getFullYear()): number {
  return currentYear - randomAge(5, 18);
}

/**
 * Generate random household name
 */
export function randomHouseholdName(): string {
  const adjectives = [
    'Happy',
    'Sunny',
    'Cozy',
    'Bright',
    'Cheerful',
    'Lovely',
    'Peaceful',
    'Joyful',
    'Warm',
    'Friendly',
  ];
  const nouns = [
    'Family',
    'Home',
    'House',
    'Household',
    'Den',
    'Nest',
    'Haven',
    'Place',
    'Space',
    'Abode',
  ];

  return `${randomElement(adjectives)} ${randomElement(nouns)}`;
}

/**
 * Generate random task name
 */
export function randomTaskName(): string {
  const verbs = [
    'Clean',
    'Wash',
    'Organize',
    'Tidy',
    'Vacuum',
    'Dust',
    'Sort',
    'Put away',
    'Take out',
    'Feed',
  ];
  const objects = [
    'bedroom',
    'dishes',
    'toys',
    'bathroom',
    'kitchen',
    'living room',
    'backyard',
    'garage',
    'closet',
    'pet',
  ];

  return `${randomElement(verbs)} ${randomElement(objects)}`;
}

/**
 * Generate random task description
 */
export function randomTaskDescription(): string {
  const descriptions = [
    'Make sure everything is clean and organized',
    'Put everything in its proper place',
    'Clean thoroughly and check all corners',
    'Be careful and do a good job',
    'Take your time and do it right',
    'Remember to put things back where they belong',
  ];

  return randomElement(descriptions);
}

/**
 * Generate random task frequency
 */
export function randomTaskFrequency(): 'daily' | 'weekly' | 'monthly' | 'once' {
  const frequencies: Array<'daily' | 'weekly' | 'monthly' | 'once'> = [
    'daily',
    'weekly',
    'monthly',
    'once',
  ];
  return randomElement(frequencies);
}

/**
 * Generate random task points
 */
export function randomTaskPoints(): number {
  return randomElement([5, 10, 15, 20, 25, 30]);
}

/**
 * Generate random date within range
 */
export function randomDate(startDate: Date, endDate: Date): Date {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return new Date(start + Math.random() * (end - start));
}

/**
 * Generate random ISO date string
 */
export function randomISODate(): string {
  const now = new Date();
  const pastDays = randomInt(0, 30);
  const date = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * Generate random assignment status
 */
export function randomAssignmentStatus(): 'pending' | 'completed' | 'skipped' {
  return randomElement(['pending', 'completed', 'skipped']);
}

/**
 * Generate random household role
 */
export function randomHouseholdRole(): 'owner' | 'admin' | 'member' {
  return randomElement(['owner', 'admin', 'member']);
}

/**
 * Generate test data bundle for a user
 */
export interface UserTestData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export function generateUserTestData(prefix = 'test'): UserTestData {
  return {
    email: randomEmail(prefix),
    password: randomPassword(),
    firstName: randomName('first'),
    lastName: randomName('last'),
  };
}

/**
 * Generate test data bundle for a household
 */
export interface HouseholdTestData {
  name: string;
  ownerEmail: string;
  ownerPassword: string;
}

export function generateHouseholdTestData(): HouseholdTestData {
  return {
    name: randomHouseholdName(),
    ownerEmail: randomEmail('household-owner'),
    ownerPassword: randomPassword(),
  };
}

/**
 * Generate test data bundle for a child
 */
export interface ChildTestData {
  name: string;
  age: number;
  birthYear: number;
}

export function generateChildTestData(): ChildTestData {
  const age = randomAge();
  return {
    name: randomFullName(),
    age,
    birthYear: new Date().getFullYear() - age,
  };
}

/**
 * Generate test data bundle for a task
 */
export interface TaskTestData {
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  points: number;
}

export function generateTaskTestData(): TaskTestData {
  return {
    title: randomTaskName(),
    description: randomTaskDescription(),
    frequency: randomTaskFrequency(),
    points: randomTaskPoints(),
  };
}
