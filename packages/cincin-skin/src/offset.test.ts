import { offsetVars } from './offset';

describe('offsetVars', () => {
  it('should read a bare value as the vertical axis', () => {
    expect(offsetVars(56)).toEqual({ '--cincin-offset-y': '56px' });
    expect(offsetVars('2rem')).toEqual({ '--cincin-offset-y': '2rem' });
  });

  it('should write only the axes it was given', () => {
    expect(offsetVars({ x: 24 })).toEqual({ '--cincin-offset-x': '24px' });
    expect(offsetVars({ x: 0, y: '1rem' })).toEqual({
      '--cincin-offset-x': '0px',
      '--cincin-offset-y': '1rem',
    });
  });

  it('should write nothing without a value', () => {
    // The stylesheet owns the channel until a prop claims it: an
    // inline value would outrank the page's own media queries.
    expect(offsetVars(undefined)).toEqual({});
    expect(offsetVars({})).toEqual({});
  });
});
