import { anchorsOf, outwardDirections } from './position';

describe('anchorsOf', () => {
  it('should split a position into the list anchors', () => {
    expect(anchorsOf('bottom-right')).toEqual({ y: 'bottom', x: 'right' });
    expect(anchorsOf('top-center')).toEqual({ y: 'top', x: 'center' });
  });
});

describe('outwardDirections', () => {
  it('should offer a corner its two edges', () => {
    expect(outwardDirections('bottom-right')).toEqual(['right', 'down']);
    expect(outwardDirections('top-left')).toEqual(['left', 'up']);
  });

  it('should offer a center only its vertical edge', () => {
    // Neither horizontal edge is near a center: the only honest exit
    // is the vertical one, and the horizontal axis stays foreign.
    expect(outwardDirections('bottom-center')).toEqual(['down']);
    expect(outwardDirections('top-center')).toEqual(['up']);
  });
});
