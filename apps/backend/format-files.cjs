// Quick formatting script
const { execSync } = require('child_process');
const path = require('path');

const files = [
  'src/repositories/task-response.repository.test.ts',
  'src/repositories/task-response.repository.ts',
  'src/routes/single-tasks.ts',
];

files.forEach((file) => {
  try {
    console.log(`Formatting ${file}...`);
    execSync(`npx prettier --write "${file}"`, { stdio: 'inherit', cwd: __dirname });
    console.log(`✓ Formatted ${file}`);
  } catch (error) {
    console.error(`✗ Failed to format ${file}:`, error.message);
  }
});

console.log('\nDone!');
