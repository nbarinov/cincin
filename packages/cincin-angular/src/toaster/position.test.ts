import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The position helpers are a verbatim copy of cincin-skin's: ng-packagr
// leaves every bare import external, and the skin kit is a private
// workspace package that no consumer can install, so the Angular build
// cannot inline it the way tsdown does for the siblings. Both copies
// rot in silence; this fails the suite when they stop matching. The
// paths ride the working directory (vitest runs from the package root)
// because under jsdom import.meta.url is an http URL.
describe('position helpers', () => {
  it('should mirror cincin-skin byte for byte', () => {
    const local = join(process.cwd(), 'src/toaster/position.ts');
    const skin = join(process.cwd(), '../cincin-skin/src/position.ts');

    expect(readFileSync(local, 'utf8')).toBe(readFileSync(skin, 'utf8'));
  });
});
