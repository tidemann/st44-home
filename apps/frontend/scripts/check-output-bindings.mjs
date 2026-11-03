// Fails when a template listens to an output that the component does not have (ST-2168).
// Angular compiles <app-modal (closeRequested)="..."> without an error: it becomes a DOM event
// that never fires, so the ✕, the dimmed background and Escape on that popup did nothing.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/app', import.meta.url));
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|html)$/.test(name) && !/\.(spec|stories)\.ts$/.test(name)) files.push(path);
  }
};
walk(root);

// selector -> the names it emits: output(), model() (+Change) and @Output()
const outputs = new Map();
for (const file of files.filter((f) => f.endsWith('.ts'))) {
  const src = readFileSync(file, 'utf8');
  const selector = src.match(/selector:\s*'(app-[\w-]+)'/)?.[1];
  if (!selector) continue;
  const names = new Set();
  for (const m of src.matchAll(/(\w+)\s*=\s*(output|model)\s*[<(]/g)) {
    names.add(m[1]);
    if (m[2] === 'model') names.add(`${m[1]}Change`);
  }
  for (const m of src.matchAll(/@Output\([^)]*\)\s*(\w+)/g)) names.add(m[1]);
  outputs.set(selector, names);
}

// DOM events a component host may listen to on purpose
const domEvents = new Set(['click', 'keydown', 'keyup', 'focusin', 'focusout', 'pointerdown']);
const problems = [];
for (const file of files.filter((f) => f.endsWith('.html'))) {
  const src = readFileSync(file, 'utf8');
  for (const tag of src.matchAll(/<(app-[\w-]+)\b([^>]*)>/g)) {
    const names = outputs.get(tag[1]);
    if (!names) continue;
    for (const binding of tag[2].matchAll(/\(([\w.]+)\)=/g)) {
      const event = binding[1];
      if (names.has(event) || domEvents.has(event.split('.')[0])) continue;
      problems.push(
        `${relative(root, file)}: <${tag[1]} (${event})>, but ${tag[1]} emits only: ${[...names].join(', ') || 'nothing'}`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`Listening to an output that does not exist:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`Output bindings OK (${outputs.size} components)`);
