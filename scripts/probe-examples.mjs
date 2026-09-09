// An example has to work as a bare folder too, so it names published
// versions and spells tsconfig.base.json out instead of extending it.
// Both copies rot in silence; this fails the check when they stop
// matching the workspace.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

// The tsconfigs carry whole-line comments and nothing fancier.
const read = (path) =>
  JSON.parse(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('//'))
      .join('\n')
  );
const dirs = (path) =>
  readdirSync(join(root, path), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, path, entry.name));

const versions = new Map(
  dirs('packages').map((dir) => {
    const manifest = read(join(dir, 'package.json'));
    return [manifest.name, manifest.version];
  })
);

const problems = [];
for (const dir of dirs('examples')) {
  const manifest = read(join(dir, 'package.json'));
  for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
    const version = versions.get(name);
    if (version === undefined) continue;

    const expected = `^${version}`;
    if (range !== expected) {
      problems.push(
        `examples/${manifest.name.replace('cincin-example-', '')}: ${name}@${range}, the workspace ships ${version} (expected "${expected}")`
      );
    }
  }
}

// `lib` is the one base option an example may widen, for the DOM.
const base = read(join(root, 'tsconfig.base.json')).compilerOptions;

for (const dir of dirs('examples')) {
  const options = read(join(dir, 'tsconfig.json')).compilerOptions;
  const name = dir.slice(dir.lastIndexOf('/') + 1);

  for (const [option, value] of Object.entries(base)) {
    const mine = options[option];
    const ok =
      option === 'lib'
        ? Array.isArray(mine) && value.every((entry) => mine.includes(entry))
        : JSON.stringify(mine) === JSON.stringify(value);

    if (!ok) {
      problems.push(
        `examples/${name}/tsconfig.json: ${option} is ${JSON.stringify(mine)}, tsconfig.base.json says ${JSON.stringify(value)}`
      );
    }
  }
}

if (problems.length > 0) {
  console.error('Examples out of step with the repository:\n');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  'The examples ask for the versions the workspace ships, on the base config.'
);
