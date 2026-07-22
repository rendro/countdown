/** Anything the `Date` constructor accepts, or a `Date`. */
export type TDateInput = Date | string | number;

/** Time remaining, split into units. */
export type TDiff = {
  years: number;
  days: number;
  hours: number;
  min: number;
  sec: number;
  millisec: number;
  /** Whole milliseconds remaining. 0 once the countdown has finished. */
  total: number;
};

/**
 * What function options see as `this`. Mirrors the public surface of Countdown
 * without importing it, which would make types.ts and countdown.ts circular.
 */
export interface ICountdownContext {
  readonly el: HTMLElement;
  readonly options: TOptions;
  readonly running: boolean;
  leadingZeros(num: number, length?: number, fractionDigits?: number): string;
}

export type TOptions = {
  /** The moment the countdown reaches zero. */
  date: Date;
  /** How often to re-render, in ms. `0` renders once and never repeats. */
  refresh: number;
  /** Milliseconds added to the remaining time, e.g. to correct clock skew. */
  offset: number;
  /** Called once, when the countdown reaches zero. */
  onEnd: () => void;
  /** Called on every tick with the remaining time. */
  render: (diff: TDiff) => void;
};

/** The function options as you pass them: bound to the countdown instance. */
export type TUserCallbacks = {
  onEnd: (this: ICountdownContext) => void;
  render: (this: ICountdownContext, diff: TDiff) => void;
};

/** Options accepted by the constructor. `date` takes any Date-like value. */
export type TUserOptions = Partial<
  Omit<TOptions, 'date' | keyof TUserCallbacks> &
    TUserCallbacks & { date: TDateInput }
>;
