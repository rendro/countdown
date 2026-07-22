import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { registerJQueryPlugin } from '../src/jquery.js';
import type { Countdown } from '../src/countdown.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const inFuture = (ms: number) => new Date(NOW.getTime() + ms);

/** Minimal stand-in for the slice of the jQuery API the plugin uses. */
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

describe('jQuery plugin', () => {
  let el: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    document.body.innerHTML = '';
    el = document.createElement('div');
    document.body.appendChild(el);
  });
  afterEach(() => vi.useRealTimers());

  it('throws when jQuery cannot be found', () => {
    expect(() => registerJQueryPlugin({})).toThrow(/jQuery not found/);
  });

  it('registers $.fn.countdown', () => {
    const { jq } = createFakeJQuery();
    registerJQueryPlugin(jq);
    expect(typeof jq.fn.countdown).toBe('function');
  });

  // #19 — the 2.x wrapper used the global `$` internally, so it broke under
  // jQuery.noConflict(). Nothing in the plugin may touch `$`.
  it('works when no global $ exists (noConflict)', () => {
    const { jq, select } = createFakeJQuery();
    const original = (globalThis as { $?: unknown }).$;
    delete (globalThis as { $?: unknown }).$;

    try {
      registerJQueryPlugin(jq);
      expect(() =>
        select([el]).countdown({ date: inFuture(DAY), refresh: 0 }),
      ).not.toThrow();
      expect(el.innerHTML).not.toBe('');
    } finally {
      if (original !== undefined) (globalThis as { $?: unknown }).$ = original;
    }
  });

  it('works with no options at all', () => {
    const { jq, select } = createFakeJQuery();
    registerJQueryPlugin(jq);
    // 2.x threw here: it assigned to `options.date` without checking options
    expect(() => select([el]).countdown()).not.toThrow();
  });

  it('creates one countdown per element and is chainable', () => {
    const { jq, select } = createFakeJQuery();
    registerJQueryPlugin(jq);
    const second = document.createElement('div');
    document.body.appendChild(second);
    const $els = select([el, second]);

    expect($els.countdown({ date: inFuture(DAY), refresh: 0 })).toBe($els);
    expect(el.innerHTML).not.toBe('');
    expect(second.innerHTML).not.toBe('');
  });

  it('reads the date from data-date', () => {
    const { jq, select } = createFakeJQuery();
    registerJQueryPlugin(jq);
    el.setAttribute('data-date', inFuture(2 * DAY).toISOString());

    select([el]).countdown({ refresh: 0 });

    const c = jq.data(el, 'countdown') as Countdown;
    expect(c.getDiffDate().days).toBe(2);
  });

  it('lets data-date win over an explicit date', () => {
    // matches 2.x: if ($el.data('date')) { options.date = $el.data('date'); }
    const { jq, select } = createFakeJQuery();
    registerJQueryPlugin(jq);
    el.setAttribute('data-date', inFuture(2 * DAY).toISOString());

    select([el]).countdown({ date: inFuture(5 * DAY), refresh: 0 });

    const c = jq.data(el, 'countdown') as Countdown;
    expect(c.getDiffDate().days).toBe(2);
  });

  it('does not stack instances on re-invocation', () => {
    const { jq, select } = createFakeJQuery();
    registerJQueryPlugin(jq);
    const $el = select([el]);

    $el.countdown({ date: inFuture(DAY), refresh: 100 });
    const first = jq.data(el, 'countdown');
    $el.countdown({ date: inFuture(3 * DAY), refresh: 100 });

    expect(jq.data(el, 'countdown')).toBe(first);
    expect((first as Countdown).getDiffDate().days).toBe(3);
  });

  it('exposes the instance through $.data', () => {
    const { jq, select } = createFakeJQuery();
    registerJQueryPlugin(jq);
    select([el]).countdown({ date: inFuture(DAY), refresh: 0 });

    const c = jq.data(el, 'countdown') as Countdown;
    expect(c.getDiffDate().days).toBe(1);
  });

  it("tears down on 'destroy'", () => {
    const { jq, select } = createFakeJQuery();
    registerJQueryPlugin(jq);
    const $el = select([el]);
    const render = vi.fn();

    $el.countdown({ date: inFuture(DAY), refresh: 100, render });
    $el.countdown('destroy');
    render.mockClear();
    vi.advanceTimersByTime(1000);

    expect(render).not.toHaveBeenCalled();
    expect(jq.data(el, 'countdown')).toBeUndefined();
  });
});
