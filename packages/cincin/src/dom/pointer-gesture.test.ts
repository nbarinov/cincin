import { createPointerGesture } from './pointer-gesture';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createPointerGesture', () => {
  it('should be idle until a pointer goes down', () => {
    const gesture = createPointerGesture();

    expect(gesture.active()).toBe(false);

    gesture.pointerdown();
    expect(gesture.active()).toBe(true);
  });

  it('should stay active through the task that ends the contact', () => {
    const gesture = createPointerGesture();
    gesture.pointerdown();

    // Touch: the focusing mousedown follows pointerup in the same task.
    gesture.pointerup();
    expect(gesture.active()).toBe(true);

    vi.runAllTimers();
    expect(gesture.active()).toBe(false);
  });

  it('should end on a cancel the same way', () => {
    const gesture = createPointerGesture();
    gesture.pointerdown();

    gesture.pointercancel();
    vi.runAllTimers();
    expect(gesture.active()).toBe(false);
  });

  it('should let a new contact outlive the previous end', () => {
    const gesture = createPointerGesture();
    gesture.pointerdown();
    gesture.pointerup();

    gesture.pointerdown();
    vi.runAllTimers();
    expect(gesture.active()).toBe(true);
  });
});
