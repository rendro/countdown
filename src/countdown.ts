import type {
  ICountdownContext,
  TDateInput,
  TDiff,
  TOptions,
  TUserOptions,
} from './types.js';

// all in milliseconds, which is the unit `remaining` is measured in
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** The Gregorian mean year, kept from 2.x so displayed years don't shift. */
const YEAR = 365.25 * DAY;

const ZERO_DIFF: TDiff = Object.freeze({
  years: 0,
  days: 0,
  hours: 0,
  min: 0,
  sec: 0,
  millisec: 0,
  total: 0,
});

function defaultRender(this: ICountdownContext, diff: TDiff): void {
  this.el.innerHTML =
    `${diff.years} years, ${diff.days} days, ` +
    `${this.leadingZeros(diff.hours)} hours, ` +
    `${this.leadingZeros(diff.min)} min and ` +
    `${this.leadingZeros(diff.sec)} sec`;
}

export const defaultOptions: TOptions = {
  date: new Date('2087-06-07T15:03:25'),
  refresh: 1000,
  offset: 0,
  onEnd: () => undefined,
  // resolved options hold callbacks already bound to the instance, so TOptions
  // carries no `this` requirement — see TUserCallbacks for the input shape
  render: defaultRender as TOptions['render'],
};

/**
 * Coerce a date-like value to a Date, rejecting values that would silently
 * become `Invalid Date`. 2.x let those through, so a date string Safari could
 * not parse rendered as all zeros — indistinguishable from a finished
 * countdown.
 */
export function toDate(value: TDateInput): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(
      `countdown: invalid date ${JSON.stringify(value)}. ` +
        'Prefer an ISO 8601 string such as "2026-08-23T00:00:00Z" — ' +
        'formats like "August 23, 2016 24:00:00" are not parsed consistently ' +
        'across browsers.',
    );
  }
  return date;
}

export class Countdown {
  readonly el: HTMLElement;

  options: TOptions;

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private ended = false;

  /**
   * The callbacks as the caller wrote them. Binding happens against these, so
   * repeated `restart()` calls re-bind the original rather than wrapping an
   * already-bound function again and again.
   */
  private rawCallbacks: Pick<TOptions, 'onEnd' | 'render'> = {
    onEnd: defaultOptions.onEnd,
    render: defaultOptions.render,
  };

  constructor(el: HTMLElement, userOptions: TUserOptions = {}) {
    if (!el) {
      throw new Error('countdown: no element given');
    }
    this.el = el;
    this.options = this.resolveOptions(defaultOptions, userOptions);
    this.start();
  }

  private resolveOptions(base: TOptions, user: TUserOptions): TOptions {
    const merged = { ...base } as TOptions;

    for (const [key, value] of Object.entries(user)) {
      if (value !== undefined) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }

    merged.date = toDate((user.date ?? base.date) as TDateInput);

    // bind function options so `this.el` works inside them, as 2.x did
    if (typeof user.render === 'function') {
      this.rawCallbacks.render = user.render as TOptions['render'];
    }
    if (typeof user.onEnd === 'function') {
      this.rawCallbacks.onEnd = user.onEnd as TOptions['onEnd'];
    }
    merged.render = this.rawCallbacks.render.bind(this);
    merged.onEnd = this.rawCallbacks.onEnd.bind(this);

    return merged;
  }

  /** Whether the countdown is currently ticking. */
  get running(): boolean {
    return this.intervalId !== null;
  }

  /** Whether the countdown has reached zero. */
  get finished(): boolean {
    return this.ended;
  }

  /**
   * Time remaining, split into units. Reading this never fires `onEnd`; that
   * is the job of `render()`, so simply inspecting the value has no side
   * effects.
   */
  getDiffDate(): TDiff {
    let remaining =
      this.options.date.getTime() - Date.now() + this.options.offset;

    if (remaining <= 0) {
      return { ...ZERO_DIFF };
    }

    const total = Math.floor(remaining);
    remaining = total;

    const years = Math.floor(remaining / YEAR);
    remaining -= years * YEAR;

    const days = Math.floor(remaining / DAY);
    remaining -= days * DAY;

    const hours = Math.floor(remaining / HOUR);
    remaining -= hours * HOUR;

    const min = Math.floor(remaining / MIN);
    remaining -= min * MIN;

    // floor, not round: rounding produced "60 sec" just under a minute
    const sec = Math.floor(remaining / SEC);
    remaining -= sec * SEC;

    return { years, days, hours, min, sec, millisec: remaining, total };
  }

  /**
   * Pad a number with leading zeros, optionally keeping decimal places.
   *
   * Only the integer part is padded, so the field width stays stable as the
   * fraction ticks. `fractionDigits` exists because the obvious approach —
   * `leadingZeros(sec).toFixed(2)` — cannot work: this returns a string.
   *
   * ```js
   * this.leadingZeros(7);                              // "07"
   * this.leadingZeros(diff.sec + diff.millisec / 1000, 2, 2); // "07.35"
   * ```
   */
  leadingZeros(num: number, length = 2, fractionDigits = 0): string {
    const text = fractionDigits > 0 ? num.toFixed(fractionDigits) : String(num);
    const [integer, fraction] = text.split('.');
    const padded = integer.padStart(length, '0');
    return fraction === undefined ? padded : `${padded}.${fraction}`;
  }

  /**
   * Render once. Fires `onEnd` exactly once when the countdown reaches zero,
   * including when the target date was already in the past at construction —
   * 2.x only fired it if an interval happened to be running.
   */
  render(): this {
    const diff = this.getDiffDate();
    this.options.render(diff);

    if (diff.total <= 0 && !this.ended) {
      this.ended = true;
      this.stop();
      this.options.onEnd();
    }

    return this;
  }

  /** Start ticking. Does nothing if already running. */
  start(): this {
    if (this.running) {
      return this;
    }

    // set the interval before the first render, so a countdown that is already
    // finished still stops cleanly from inside render()
    if (this.options.refresh > 0 && !this.ended) {
      this.intervalId = setInterval(() => this.render(), this.options.refresh);
    }

    this.render();
    return this;
  }

  /** Stop ticking, leaving the last rendered output in place. */
  stop(): this {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    return this;
  }

  /** Point the countdown at a new date and re-render. */
  update(newDate: TDateInput): this {
    this.options.date = toDate(newDate);
    this.ended = false;
    this.render();
    return this;
  }

  /** Adjust the offset in ms. */
  updateOffset(offset: number): this {
    this.options.offset = offset;
    return this;
  }

  /**
   * Apply new options and start again. Unlike 2.x this stops the running
   * interval first, which otherwise leaked a timer on every call.
   */
  restart(userOptions: TUserOptions = {}): this {
    this.stop();
    this.options = this.resolveOptions(this.options, userOptions);
    this.ended = false;
    this.start();
    return this;
  }

  /** Stop ticking and release the element. */
  destroy(): void {
    this.stop();
    this.ended = true;
  }
}
