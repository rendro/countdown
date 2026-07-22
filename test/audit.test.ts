import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Countdown, toDate } from '../src/countdown.js';
import { registerJQueryPlugin } from '../src/jquery.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const SEC = 1000;
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
    cleanData(elems: ArrayLike<Element>) {
      for (let i = 0; i < elems.length; i++) store.delete(elems[i]);
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

/** Regressions found by an audit of 3.0.1. */
describe('audit regressions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    document.body.innerHTML = '';
  });
  afterEach(() => vi.useRealTimers());

  describe('start() revives a countdown whose target moved back into the future', () => {
    it('resumes ticking after updateOffset', () => {
      const render = vi.fn();
      const c = new Countdown(mk(), {
        date: new Date(NOW.getTime() - SEC),
        refresh: 50,
        render,
      });
      expect(c.finished).toBe(true);
      expect(c.running).toBe(false);

      c.updateOffset(10 * SEC).start();

      expect(c.running).toBe(true);
      render.mockClear();
      vi.advanceTimersByTime(150);
      expect(render).toHaveBeenCalled();
    });

    it('still refuses to start when the target really has passed', () => {
      const c = new Countdown(mk(), {
        date: new Date(NOW.getTime() - SEC),
        refresh: 50,
        render: () => undefined,
      });
      c.start();
      expect(c.running).toBe(false);
    });
  });

  describe('jQuery data-date precedence survives re-invocation', () => {
    it('keeps using data-date on a second call', () => {
      const { jq, select } = createFakeJQuery();
      registerJQueryPlugin(jq);
      const el = mk({ 'data-date': inFuture(2 * DAY).toISOString() });
      const $el = select([el]);

      $el.countdown({ date: inFuture(9 * DAY), refresh: 0 });
      expect((jq.data(el, 'countdown') as Countdown).getDiffDate().days).toBe(2);

      // the standard "re-init after new content" pattern
      $el.countdown({ date: inFuture(9 * DAY), refresh: 0 });
      expect((jq.data(el, 'countdown') as Countdown).getDiffDate().days).toBe(2);
    });
  });

  describe('jQuery teardown stops the timer', () => {
    it('destroys the instance when jQuery cleans the element', () => {
      const { jq, select } = createFakeJQuery();
      registerJQueryPlugin(jq);
      const el = mk();
      const render = vi.fn();

      select([el]).countdown({ date: inFuture(DAY), refresh: 50, render });
      const instance = jq.data(el, 'countdown') as Countdown;
      expect(instance.running).toBe(true);

      // what $(el).remove() / .empty() / .html() do internally
      jq.cleanData([el]);

      expect(instance.running).toBe(false);
      render.mockClear();
      vi.advanceTimersByTime(500);
      expect(render).not.toHaveBeenCalled();
    });
  });

  describe('leadingZeros never reports an impossible value', () => {
    it('does not round 59.999 seconds up to 60', () => {
      const c = new Countdown(mk(), { date: inFuture(DAY), refresh: 0 });
      expect(c.leadingZeros(59.999, 2, 2)).toBe('59.99');
    });

    it('matches the readme snippet at the end of a second', () => {
      const c = new Countdown(mk(), {
        date: inFuture(15 * SEC + 999),
        refresh: 0,
        render: () => undefined,
      });
      const d = c.getDiffDate();
      const rendered = c.leadingZeros(d.sec + d.millisec / 1000, 2, 2);
      expect(rendered).not.toMatch(/^60/);
      expect(rendered).toBe('15.99');
    });
  });

  describe('toDate copies', () => {
    it('is immune to the caller mutating their Date', () => {
      const d = inFuture(DAY);
      const copy = toDate(d);
      d.setFullYear(2099);
      expect(copy.getTime()).toBe(inFuture(DAY).getTime());
    });
  });
});
