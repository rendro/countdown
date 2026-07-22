import { Countdown } from './countdown.js';
import type { TUserOptions } from './types.js';

const DATA_KEY = 'countdown';

type TPatched = ((elems: ArrayLike<Element>) => void) & {
  __countdownPatched?: boolean;
};

type TJQueryLike = {
  fn: Record<string, unknown>;
  data(el: unknown, key: string, value?: unknown): unknown;
  removeData(el: unknown, key: string): unknown;
  /** Present on real jQuery; used to stop the timer when an element is removed. */
  _data?: (el: unknown, key: string) => unknown;
  cleanData?: (elems: ArrayLike<Element>) => void;
};

/**
 * Register `$.fn.countdown` on a jQuery instance.
 *
 * Called automatically on import when a global `jQuery` is present; call it
 * yourself when jQuery loads after this bundle or lives in a module scope.
 *
 * The 2.x wrapper referenced the global `$` internally, so it broke under
 * `jQuery.noConflict()`. Nothing here touches `$`.
 */
export function registerJQueryPlugin($?: unknown): void {
  const jq = ($ ??
    (globalThis as { jQuery?: unknown }).jQuery) as TJQueryLike | undefined;

  if (!jq || !jq.fn) {
    throw new Error(
      'countdown: jQuery not found — pass it to registerJQueryPlugin($)',
    );
  }

  // $(el).remove(), .empty() and .html() run jQuery's cleanData, which drops
  // our data entry without stopping the interval. The countdown then ticks
  // forever against a detached node, and the instance is unreachable.
  if (typeof jq.cleanData === 'function' && !(jq.cleanData as TPatched).__countdownPatched) {
    const original = jq.cleanData.bind(jq);
    const patched = ((elems: ArrayLike<Element>) => {
      for (let i = 0; i < elems.length; i++) {
        const instance = jq.data(elems[i], DATA_KEY) as Countdown | undefined;
        instance?.destroy();
      }
      return original(elems);
    }) as TPatched;
    patched.__countdownPatched = true;
    jq.cleanData = patched;
  }

  jq.fn[DATA_KEY] = function countdown(
    this: ArrayLike<HTMLElement>,
    options?: TUserOptions | 'destroy',
  ) {
    for (let i = 0; i < this.length; i++) {
      const el = this[i];
      const existing = jq.data(el, DATA_KEY) as Countdown | undefined;

      if (options === 'destroy') {
        existing?.destroy();
        jq.removeData(el, DATA_KEY);
        continue;
      }

      // `data-date` wins over the options object, as in 2.x — that ordering
      // is what lets one call configure many elements with per-element dates.
      // Unlike 2.x we copy rather than mutate the caller's options, which
      // otherwise leaked the first element's date onto every later one.
      // This has to happen for re-invocation too: reading it only on first
      // init meant a second call silently inverted the precedence.
      const dataDate = el.dataset?.date;
      const merged: TUserOptions = { ...options };
      if (dataDate) {
        merged.date = dataDate;
      }

      if (existing) {
        // re-invoking on an initialized element restarts it with new options
        existing.restart(merged);
        continue;
      }

      jq.data(el, DATA_KEY, new Countdown(el, merged));
    }
    return this;
  };
}

if ((globalThis as { jQuery?: unknown }).jQuery) {
  registerJQueryPlugin();
}

export { Countdown };
export default registerJQueryPlugin;
