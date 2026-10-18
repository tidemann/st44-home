// ST-879 — synthetic family for desktop/tablet screenshots. No real user data.
const HH = '11111111-1111-4111-8111-111111111111';
const C = {
  emma: '22222222-2222-4222-8222-222222222221',
  jonas: '22222222-2222-4222-8222-222222222222',
  mathea: '22222222-2222-4222-8222-222222222223',
};
const iso = (d = 0) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
};
const dt = (d = 0) => new Date(Date.now() + d * 864e5).toISOString();

let n = 0;
const uid = () => {
  n += 1;
  return `33333333-3333-4333-8333-3333333333${String(n).padStart(2, '0')}`;
};

const row = (title, childId, childName, date, status, points, h = 16) => ({
  id: uid(),
  taskId: uid(),
  title,
  description: null,
  ruleType: 'daily',
  childId,
  childName,
  date,
  status,
  completedAt: status === 'completed' ? `${date}T${h}:10:00.000Z` : null,
  createdAt: dt(-20),
  points,
});

const today = [
  row('Tømme oppvaskmaskin', C.emma, 'Emma', iso(0), 'completed', 5),
  row('Dekke bord', C.mathea, 'Mathea', iso(0), 'pending', 5),
  row('Mate katten', C.jonas, 'Jonas', iso(0), 'pending', 5),
  row('Rydde rommet', C.emma, 'Emma', iso(0), 'pending', 10),
  row('Ta ut søpla', C.mathea, 'Mathea', iso(0), 'pending', 5),
  row('Henge opp klær', C.emma, 'Emma', iso(0), 'completed', 5, 14),
];
const overdue = [row('Støvsuge stua', C.jonas, 'Jonas', iso(-2), 'pending', 10)];
const tomorrow = [
  row('Vanne blomstene', C.mathea, 'Mathea', iso(1), 'pending', 5),
  row('Brette håndklær', C.emma, 'Emma', iso(1), 'pending', 5),
];

const members = [
  {
    userId: '44444444-4444-4444-8444-444444444441',
    email: 'forelder@example.test',
    displayName: 'Kari',
    role: 'admin',
    joinedAt: dt(-60),
    tasksCompleted: 0,
    totalTasks: 0,
    points: 0,
  },
  {
    userId: C.emma,
    email: null,
    displayName: 'Emma',
    role: 'child',
    joinedAt: dt(-55),
    tasksCompleted: 2,
    totalTasks: 4,
    points: 340,
  },
  {
    userId: C.jonas,
    email: null,
    displayName: 'Jonas',
    role: 'child',
    joinedAt: dt(-55),
    tasksCompleted: 0,
    totalTasks: 2,
    points: 215,
  },
  {
    userId: C.mathea,
    email: null,
    displayName: 'Mathea',
    role: 'child',
    joinedAt: dt(-55),
    tasksCompleted: 0,
    totalTasks: 2,
    points: 180,
  },
];

const children = ['Emma', 'Jonas', 'Mathea'].map((name, i) => ({
  id: [C.emma, C.jonas, C.mathea][i],
  householdId: HH,
  name,
  avatarUrl: null,
  points: [340, 215, 180][i],
  createdAt: dt(-55),
  updatedAt: dt(-1),
}));

const tasks = [
  'Tømme oppvaskmaskin',
  'Dekke bord',
  'Mate katten',
  'Rydde rommet',
  'Ta ut søpla',
  'Støvsuge stua',
].map((title, i) => ({
  id: uid(),
  householdId: HH,
  title,
  description: null,
  points: [5, 5, 5, 10, 5, 10][i],
  ruleType: 'daily',
  ruleConfig: {},
  childId: [C.emma, C.mathea, C.jonas, C.emma, C.mathea, C.jonas][i],
  active: true,
  createdAt: dt(-20),
  updatedAt: dt(-2),
}));

const rewards = [
  { title: 'Kino med en venn', cost: 60, redeemable: true },
  { title: 'Ett spill på Switch', cost: 250, redeemable: false },
  { title: 'Sove ute i telt', cost: 120, redeemable: false },
].map((r) => ({
  id: uid(),
  householdId: HH,
  title: r.title,
  description: null,
  pointsCost: r.cost,
  active: true,
  createdAt: dt(-20),
  updatedAt: dt(-2),
}));

module.exports = { HH, C, iso, today, overdue, tomorrow, members, children, tasks, rewards };
