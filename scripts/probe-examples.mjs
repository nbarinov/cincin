// Two ways an example can drift out of the repository it demos, both
// invisible until someone opens the folder on its own.
//
// One: it names its cincin packages by published version, not by
// `workspace:*`, so the folder also stands alone: opened in StackBlitz
// or copied out of the repo, it installs from npm and runs. Inside the
// workspace pnpm links the local copies over those ranges, which is
// what keeps the source loop — but only while the range still matches
// what the workspace ships. This probe fails the release that forgets
// to move it, before a stale example quietly demos an old library.
//
// Two: its tsconfig spells the base config out instead of extending it,
// because a standalone folder has no repository root above it to extend.
// That copy is only honest while it still says what tsconfig.base.json
// says, so the base stays the source of truth and this probe is what
// makes it one.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

// The example tsconfigs carry whole-line comments and nothing fancier.
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

// `lib` is the one base option an example is expected to widen (the DOM);
// anything else it adds — jsx, types — the base never spoke about.
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
