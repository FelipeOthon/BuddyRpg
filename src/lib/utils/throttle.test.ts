import { describe, expect, it, vi } from "vitest";
import { throttle } from "./throttle";

describe("throttle", () => {
  it("executes immediately on first call and throttles subsequent rapid calls", () => {
    vi.useFakeTimers();
    const calls: number[] = [];
    const fn = throttle((x: number) => calls.push(x), 50);

    fn(1);
    fn(2);
    fn(3);
    expect(calls).toEqual([1]);

    vi.advanceTimersByTime(50);
    expect(calls).toEqual([1, 3]);
    vi.useRealTimers();
  });
});
