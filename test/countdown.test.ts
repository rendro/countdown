import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Countdown, toDate, defaultOptions } from '../src/countdown.js';

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const YEAR = 365.25 * DAY;

/** A fixed "now" so every assertion is deterministic. */
const NOW = new Date('2026-01-01T00:00:00.000Z');

function createEl(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

/** A date `ms` in the future relative to the frozen clock. */
const inFuture = (ms: number) => new Date(NOW.getTime() + ms);

describe('Countdown', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  describe('construction', () => {
    it('works with no options at all', () => {
      expect(() => new Countdown(createEl())).not.toThrow();
    });

    it('throws without an element', () => {
      expect(() => new Countdown(undefined as unknown as HTMLElement)).toThrow(
        /no element given/,
      );
    });

    it('renders immediately', () => {
      const el = createEl();
      new Countdown(el, { date: inFuture(DAY), refresh: 0 });
      expect(el.innerHTML).not.toBe('');
    });

    it('accepts a Date, a string and a number', () => {
      for (const date of [
        inFuture(HOUR),
        inFuture(HOUR).toISOString(),
        inFuture(HOUR).getTime(),
      ]) {
        const c = new Countdown(createEl(), { date, refresh: 0 });
        expect(c.getDiffDate().hours).toBe(1);
      }
    });
  });

  describe('toDate (#32 — invalid dates)', () => {
    it('rejects a value that would become Invalid Date', () => {
      // Note: the exact string from the iPhone report, "August 23, 2016
      // 24:00:00", cannot be used here — V8 accepts hour 24 and rolls it to
      // the next day, while Safari returns Invalid Date. That engine split is
      // the bug. What this guard fixes is the consequence: on the engines that
      // reject such a string, the countdown used to render all zeros, which is
      // indistinguishable from "finished". Now it throws.
      expect(() => toDate('nonsense')).toThrow(/invalid date/);
      expect(() => toDate(NaN)).toThrow(/invalid date/);
      expect(() => toDate(new Date('nope'))).toThrow(/invalid date/);
    });

    it('names the offending value and suggests ISO 8601', () => {
      expect(() => toDate('not a date')).toThrow(/"not a date"/);
      expect(() => toDate('not a date')).toThrow(/ISO 8601/);
    });

    it('surfaces the error through the constructor rather than showing zeros', () => {
      expect(
        () => new Countdown(createEl(), { date: 'nonsense' }),
      ).toThrow(/invalid date/);
    });

    it('passes valid values through untouched', () => {
      const d = inFuture(DAY);
      expect(toDate(d)).toBe(d);
      expect(toDate(d.toISOString()).getTime()).toBe(d.getTime());
    });
  });

  describe('getDiffDate', () => {
    it('splits the remaining time into units', () => {
      const c = new Countdown(createEl(), {
        date: inFuture(2 * YEAR + 3 * DAY + 4 * HOUR + 5 * MIN + 6 * SEC),
        refresh: 0,
      });
      const d = c.getDiffDate();

      expect(d).toMatchObject({ years: 2, days: 3, hours: 4, min: 5, sec: 6 });
    });

    it('never reports 60 seconds', () => {
      // 59.7s: 2.x used Math.round here and rendered "60 sec"
      const c = new Countdown(createEl(), {
        date: inFuture(59.7 * SEC),
        refresh: 0,
      });
      expect(c.getDiffDate().sec).toBe(59);
    });

    it('keeps every unit inside its range across a full minute', () => {
      for (let ms = 0; ms < 60 * SEC; ms += 137) {
        const c = new Countdown(createEl(), {
          date: inFuture(ms),
          refresh: 0,
          render: () => undefined,
        });
        const d = c.getDiffDate();
        expect(d.sec).toBeGreaterThanOrEqual(0);
        expect(d.sec).toBeLessThan(60);
        expect(d.millisec).toBeGreaterThanOrEqual(0);
        expect(d.millisec).toBeLessThan(1000);
      }
    });

    it('returns all zeros once the date has passed', () => {
      const c = new Countdown(createEl(), {
        date: new Date(NOW.getTime() - SEC),
        refresh: 0,
        render: () => undefined,
      });
      expect(c.getDiffDate()).toEqual({
        years: 0,
        days: 0,
        hours: 0,
        min: 0,
        sec: 0,
        millisec: 0,
        total: 0,
      });
    });

    it('reports the total remaining milliseconds', () => {
      const c = new Countdown(createEl(), { date: inFuture(90 * SEC), refresh: 0 });
      expect(c.getDiffDate().total).toBe(90 * SEC);
    });

    it('has no side effects — reading it does not fire onEnd', () => {
      const onEnd = vi.fn();
      const c = new Countdown(createEl(), {
        date: inFuture(SEC),
        refresh: 0,
        onEnd,
        render: () => undefined,
      });
      onEnd.mockClear();

      vi.setSystemTime(new Date(NOW.getTime() + 2 * SEC));
      c.getDiffDate();
      c.getDiffDate();

      expect(onEnd).not.toHaveBeenCalled();
    });
  });

  describe('onEnd (#33)', () => {
    it('fires when the countdown reaches zero while running', () => {
      const onEnd = vi.fn();
      new Countdown(createEl(), {
        date: inFuture(2 * SEC),
        refresh: 100,
        onEnd,
        render: () => undefined,
      });

      vi.advanceTimersByTime(3 * SEC);

      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('fires when the date was already past at construction', () => {
      // 2.x never fired here: onEnd was gated on an interval already existing
      const onEnd = vi.fn();
      new Countdown(createEl(), {
        date: new Date(NOW.getTime() - SEC),
        refresh: 0,
        onEnd,
        render: () => undefined,
      });

      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('fires with refresh disabled', () => {
      const onEnd = vi.fn();
      new Countdown(createEl(), {
        date: new Date(NOW.getTime() - SEC),
        refresh: 0,
        onEnd,
        render: () => undefined,
      });
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('fires exactly once, however long it keeps ticking', () => {
      const onEnd = vi.fn();
      new Countdown(createEl(), {
        date: inFuture(SEC),
        refresh: 50,
        onEnd,
        render: () => undefined,
      });

      vi.advanceTimersByTime(30 * SEC);

      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('stops the interval when it ends', () => {
      const c = new Countdown(createEl(), {
        date: inFuture(SEC),
        refresh: 50,
        render: () => undefined,
      });
      expect(c.running).toBe(true);

      vi.advanceTimersByTime(2 * SEC);

      expect(c.running).toBe(false);
      expect(c.finished).toBe(true);
    });
  });

  describe('ticking', () => {
    it('re-renders on the refresh interval', () => {
      const render = vi.fn();
      new Countdown(createEl(), { date: inFuture(DAY), refresh: 1000, render });
      render.mockClear();

      vi.advanceTimersByTime(3000);

      expect(render).toHaveBeenCalledTimes(3);
    });

    it('renders once and never repeats when refresh is 0', () => {
      const render = vi.fn();
      new Countdown(createEl(), { date: inFuture(DAY), refresh: 0, render });
      expect(render).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(10 * SEC);

      expect(render).toHaveBeenCalledTimes(1);
    });

    it('counts down as time passes', () => {
      const el = createEl();
      const c = new Countdown(el, { date: inFuture(10 * SEC), refresh: 1000 });
      expect(c.getDiffDate().sec).toBe(10);

      vi.advanceTimersByTime(4 * SEC);

      expect(c.getDiffDate().sec).toBe(6);
    });
  });

  describe('start / stop', () => {
    it('stop halts rendering', () => {
      const render = vi.fn();
      const c = new Countdown(createEl(), {
        date: inFuture(DAY),
        refresh: 100,
        render,
      });
      c.stop();
      render.mockClear();

      vi.advanceTimersByTime(SEC);

      expect(render).not.toHaveBeenCalled();
      expect(c.running).toBe(false);
    });

    it('start resumes', () => {
      const render = vi.fn();
      const c = new Countdown(createEl(), {
        date: inFuture(DAY),
        refresh: 100,
        render,
      });
      c.stop().start();
      render.mockClear();

      vi.advanceTimersByTime(300);

      expect(render).toHaveBeenCalledTimes(3);
    });

    it('start is idempotent — it does not stack intervals', () => {
      const render = vi.fn();
      const c = new Countdown(createEl(), {
        date: inFuture(DAY),
        refresh: 100,
        render,
      });
      c.start().start().start();
      render.mockClear();

      vi.advanceTimersByTime(300);

      expect(render).toHaveBeenCalledTimes(3);
    });
  });

  describe('restart', () => {
    it('does not leak the previous interval', () => {
      // 2.x set this.interval = false without clearing it, so every restart
      // left another timer running and render fired N times per tick
      const render = vi.fn();
      const c = new Countdown(createEl(), {
        date: inFuture(DAY),
        refresh: 100,
        render,
      });

      c.restart({ date: inFuture(2 * DAY) });
      c.restart({ date: inFuture(3 * DAY) });
      render.mockClear();

      vi.advanceTimersByTime(300);

      expect(render).toHaveBeenCalledTimes(3);
    });

    it('applies new options', () => {
      const c = new Countdown(createEl(), { date: inFuture(DAY), refresh: 100 });
      c.restart({ date: inFuture(2 * DAY), offset: 5 });

      expect(c.options.offset).toBe(5);
      expect(c.getDiffDate().days).toBe(2);
    });

    it('keeps callbacks bound to the instance, and does not re-wrap them', () => {
      const el = createEl();
      const seen: unknown[] = [];
      const c = new Countdown(el, {
        date: inFuture(DAY),
        refresh: 0,
        render() {
          seen.push(this.el);
        },
      });

      const firstRender = c.options.render;
      for (let i = 0; i < 50; i++) c.restart({ date: inFuture(DAY) });

      // still the caller's function, bound once — not 51 nested wrappers
      expect(c.options.render).not.toBe(firstRender);
      expect(seen).toHaveLength(51);
      expect(seen.every((v) => v === el)).toBe(true);
    });

    it('carries callbacks forward when restart omits them', () => {
      const render = vi.fn();
      const c = new Countdown(createEl(), {
        date: inFuture(DAY),
        refresh: 0,
        render,
      });
      render.mockClear();

      c.restart({ offset: 10 });

      expect(render).toHaveBeenCalledTimes(1);
      expect(c.options.offset).toBe(10);
    });

    it('revives a finished countdown', () => {
      const c = new Countdown(createEl(), {
        date: new Date(NOW.getTime() - SEC),
        refresh: 100,
        render: () => undefined,
      });
      expect(c.finished).toBe(true);

      c.restart({ date: inFuture(DAY) });

      expect(c.finished).toBe(false);
      expect(c.running).toBe(true);
    });
  });

  describe('update / updateOffset', () => {
    it('update points at a new date and re-renders', () => {
      const render = vi.fn();
      const c = new Countdown(createEl(), {
        date: inFuture(DAY),
        refresh: 0,
        render,
      });
      render.mockClear();

      c.update(inFuture(2 * DAY));

      expect(render).toHaveBeenCalledTimes(1);
      expect(c.getDiffDate().days).toBe(2);
    });

    it('re-renders a finished countdown but does not resume ticking on its own', () => {
      // documented behaviour: call start() to resume, as the example does
      const c = new Countdown(createEl(), {
        date: new Date(NOW.getTime() - SEC),
        refresh: 100,
        render: () => undefined,
      });
      expect(c.finished).toBe(true);

      c.update(inFuture(DAY));

      expect(c.finished).toBe(false);
      expect(c.running).toBe(false);

      c.start();
      expect(c.running).toBe(true);
    });

    it('update rejects an invalid date', () => {
      const c = new Countdown(createEl(), { date: inFuture(DAY), refresh: 0 });
      expect(() => c.update('nonsense')).toThrow(/invalid date/);
    });

    it('updateOffset shifts the remaining time', () => {
      const c = new Countdown(createEl(), { date: inFuture(10 * SEC), refresh: 0 });
      c.updateOffset(5 * SEC);
      expect(c.getDiffDate().sec).toBe(15);
    });

    it('returns the instance for chaining', () => {
      const c = new Countdown(createEl(), { date: inFuture(DAY), refresh: 0 });
      expect(c.update(inFuture(DAY)).updateOffset(0).stop().start()).toBe(c);
    });
  });

  describe('destroy (#29)', () => {
    it('stops the interval', () => {
      const render = vi.fn();
      const c = new Countdown(createEl(), {
        date: inFuture(DAY),
        refresh: 100,
        render,
      });

      c.destroy();
      render.mockClear();
      vi.advanceTimersByTime(SEC);

      expect(render).not.toHaveBeenCalled();
      expect(c.running).toBe(false);
    });

    it('is safe to call twice', () => {
      const c = new Countdown(createEl(), { date: inFuture(DAY), refresh: 100 });
      expect(() => {
        c.destroy();
        c.destroy();
      }).not.toThrow();
    });
  });

  describe('callbacks are bound to the instance', () => {
    it('render sees this.el and this.leadingZeros', () => {
      const el = createEl();
      let seenEl: unknown;
      let padded: string | undefined;
      new Countdown(el, {
        date: inFuture(HOUR),
        refresh: 0,
        render() {
          seenEl = this.el;
          padded = this.leadingZeros(7);
        },
      });

      expect(seenEl).toBe(el);
      expect(padded).toBe('07');
    });

    it('onEnd sees this.el', () => {
      const el = createEl();
      let seenEl: unknown;
      new Countdown(el, {
        date: new Date(NOW.getTime() - SEC),
        refresh: 0,
        render: () => undefined,
        onEnd() {
          seenEl = this.el;
        },
      });

      expect(seenEl).toBe(el);
    });
  });

  describe('leadingZeros', () => {
    it('pads to two digits by default', () => {
      const c = new Countdown(createEl(), { date: inFuture(DAY), refresh: 0 });
      expect(c.leadingZeros(7)).toBe('07');
      expect(c.leadingZeros(70)).toBe('70');
    });

    it('honours a custom length and never truncates', () => {
      const c = new Countdown(createEl(), { date: inFuture(DAY), refresh: 0 });
      expect(c.leadingZeros(7, 4)).toBe('0007');
      expect(c.leadingZeros(123456, 2)).toBe('123456');
    });

    // #25 — `leadingZeros(sec).toFixed(2)` cannot work, it returns a string
    describe('decimal seconds (#25)', () => {
      const chart = () =>
        new Countdown(createEl(), { date: inFuture(DAY), refresh: 0 });

      it('keeps decimal places when asked', () => {
        expect(chart().leadingZeros(15, 2, 2)).toBe('15.00');
        expect(chart().leadingZeros(7.354, 2, 2)).toBe('07.35');
      });

      it('pads only the integer part, so the width stays stable', () => {
        expect(chart().leadingZeros(7.5, 2, 1)).toBe('07.5');
        expect(chart().leadingZeros(7.5, 4, 1)).toBe('0007.5');
      });

      it('rounds to the requested precision', () => {
        expect(chart().leadingZeros(9.999, 2, 2)).toBe('10.00');
      });

      it('is unchanged when fractionDigits is omitted or zero', () => {
        expect(chart().leadingZeros(15)).toBe('15');
        expect(chart().leadingZeros(15, 2, 0)).toBe('15');
      });

      it('renders fractional seconds from a real diff', () => {
        const c = new Countdown(createEl(), {
          date: inFuture(15 * SEC + 250),
          refresh: 0,
          render: () => undefined,
        });
        const d = c.getDiffDate();

        expect(c.leadingZeros(d.sec + d.millisec / 1000, 2, 2)).toBe('15.25');
      });
    });
  });

  describe('default render', () => {
    it('writes a readable string into the element', () => {
      const el = createEl();
      new Countdown(el, {
        date: inFuture(DAY + 2 * HOUR + 3 * MIN + 4 * SEC),
        refresh: 0,
      });

      expect(el.innerHTML).toBe('0 years, 1 days, 02 hours, 03 min and 04 sec');
    });

    it('is exported for reuse', () => {
      expect(typeof defaultOptions.render).toBe('function');
      expect(defaultOptions.refresh).toBe(1000);
    });
  });
});
