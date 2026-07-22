import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Countdown } from '../src/countdown.js';
import { registerJQueryPlugin } from '../src/jquery.js';

/**
 * Compatibility with 2.x. easy-countdown 2.2.0 has a real installed base, so
 * anything that silently changes behaviour for a config that worked there is a
 * bug rather than a design decision.
 */
const NOW = new Date('2026-01-01T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const inFuture = (ms: number) => new Date(NOW.getTime() + ms);

function createFakeJQuery() {
  const store = new WeakMap<object, Record<string, unknown>>();
  const jq = {
    fn: {} as Record<string, unknown>,
    data(el: object, key: string, value?: unknown) {
      const bag = store.get(el) ?? {};
      if (value === undefined) return bag[key];
      bag[key] = value;
      store.set(el, bag);
      return value;
    },
    removeData(el: object, key: string) {
      delete store.get(el)?.[key];
    },
  };
  const select = (els: HTMLElement[]) =>
    Object.assign(Object.create(jq.fn), els, { length: els.length });
  return { jq, select };
}

const mk = (attrs: Record<string, string> = {}) => {
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
};

describe('2.x compatibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    document.body.innerHTML = '';
  });
  afterEach(() => vi.useRealTimers());

  describe('data-date precedence (jQuery)', () => {
    it('data-date beats the options object, as in 2.x', () => {
      // 2.x: if ($el.data('date')) { options.date = $el.data('date'); }
      const { jq, select } = createFakeJQuery();
      registerJQueryPlugin(jq);
      const el = mk({ 'data-date': inFuture(2 * DAY).toISOString() });

      select([el]).countdown({ date: inFuture(5 * DAY), refresh: 0 });

      const c = jq.data(el, 'countdown') as Countdown;
      expect(c.getDiffDate().days).toBe(2);
    });

    it('gives each element its own data-date from one shared call', () => {
      const { jq, select } = createFakeJQuery();
      registerJQueryPlugin(jq);
      const els = [1, 3, 7].map((d) =>
        mk({ 'data-date': inFuture(d * DAY).toISOString() }),
      );

      select(els).countdown({ date: inFuture(90 * DAY), refresh: 0 });

      const days = els.map(
        (el) => (jq.data(el, 'countdown') as Countdown).getDiffDate().days,
      );
      expect(days).toEqual([1, 3, 7]);
    });

    it('does not mutate the caller’s options object', () => {
      // 2.x assigned straight onto `options`, so the first element's data-date
      // leaked onto every later element that had none
      const { jq, select } = createFakeJQuery();
      registerJQueryPlugin(jq);
      const withDate = mk({ 'data-date': inFuture(2 * DAY).toISOString() });
      const without = mk();
      const options = { date: inFuture(9 * DAY), refresh: 0 };

      select([withDate, without]).countdown(options);

      expect(options.date).toEqual(inFuture(9 * DAY));
      expect(
        (jq.data(without, 'countdown') as Countdown).getDiffDate().days,
      ).toBe(9);
    });

    it('falls back to the options date when no attribute is present', () => {
      const { jq, select } = createFakeJQuery();
      registerJQueryPlugin(jq);
      const el = mk();

      select([el]).countdown({ date: inFuture(4 * DAY), refresh: 0 });

      expect((jq.data(el, 'countdown') as Countdown).getDiffDate().days).toBe(4);
    });
  });

  describe('the 2.x public surface still exists', () => {
    it('keeps the diff field names', () => {
      const c = new Countdown(mk(), { date: inFuture(DAY), refresh: 0 });
      const d = c.getDiffDate();
      for (const k of ['years', 'days', 'hours', 'min', 'sec', 'millisec']) {
        expect(d).toHaveProperty(k);
      }
    });

    it('keeps leadingZeros(num, length)', () => {
      const c = new Countdown(mk(), { date: inFuture(DAY), refresh: 0 });
      expect(c.leadingZeros(7)).toBe('07');
      expect(c.leadingZeros(7, 4)).toBe('0007');
    });

    it('keeps start / stop / update / updateOffset / restart chainable', () => {
      const c = new Countdown(mk(), { date: inFuture(DAY), refresh: 0 });
      expect(
        c.stop().start().update(inFuture(DAY)).updateOffset(0).restart({}),
      ).toBe(c);
    });

    it('accepts the non-ISO date strings 2.x examples used', () => {
      const c = new Countdown(mk(), {
        date: 'June 7, 2087 15:03:25',
        refresh: 0,
        render: () => undefined,
      });
      expect(c.getDiffDate().years).toBeGreaterThan(50);
    });

    it('binds render and onEnd to the instance', () => {
      const el = mk();
      let renderEl: unknown;
      let endEl: unknown;
      new Countdown(el, {
        date: new Date(NOW.getTime() - 1000),
        refresh: 0,
        render() {
          renderEl = this.el;
        },
        onEnd() {
          endEl = this.el;
        },
      });
      expect(renderEl).toBe(el);
      expect(endEl).toBe(el);
    });
  });
});
