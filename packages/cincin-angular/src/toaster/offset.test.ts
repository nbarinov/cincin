import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The same bargain as position.ts: a verbatim copy of cincin-skin's
// module, because ng-packagr cannot inline the private skin kit, and
// a test that fails the moment the two stop matching.
describe('offset helpers', () => {
  it('should mirror cincin-skin byte for byte', () => {
    const local = join(process.cwd(), 'src/toaster/offset.ts');
    const skin = join(process.cwd(), '../cincin-skin/src/offset.ts');

    expect(readFileSync(local, 'utf8')).toBe(readFileSync(skin, 'utf8'));
  });
});
