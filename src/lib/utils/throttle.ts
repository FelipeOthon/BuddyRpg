export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number
): (...args: Args) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;

  return (...args: Args) => {
    const now = Date.now();
    const remaining = waitMs - (now - lastCall);
    lastArgs = args;

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, remaining);
    }
  };
}
