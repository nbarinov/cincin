// An example names its cincin packages by published version, not by
// `workspace:*`, so the folder also stands alone: opened in StackBlitz
// or copied out of the repo, it installs from npm and runs. Inside the
// workspace pnpm links the local copies over those ranges, which is
// what keeps the source loop — but only while the range still matches
// what the workspace ships. This probe fails the release that forgets
// to move it, before a stale example quietly demos an old library.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
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

if (problems.length > 0) {
  console.error('Examples out of step with the packages they demo:\n');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log('The examples ask for the versions the workspace ships.');
