import { Countdown } from './countdown.js';
import type { TUserOptions } from './types.js';

const DATA_KEY = 'countdown';

type TJQueryLike = {
  fn: Record<string, unknown>;
  data(el: unknown, key: string, value?: unknown): unknown;
  removeData(el: unknown, key: string): unknown;
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

      if (existing) {
        // re-invoking on an initialized element restarts it with new options
        existing.restart(options ?? {});
        continue;
      }

      // `data-date` wins over the options object, as in 2.x — that ordering
      // is what lets one call configure many elements with per-element dates.
      // Unlike 2.x we copy rather than mutate the caller's options, which
      // otherwise leaked the first element's date onto every later one.
      const dataDate = el.dataset?.date;
      const merged: TUserOptions = { ...options };
      if (dataDate) {
        merged.date = dataDate;
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
