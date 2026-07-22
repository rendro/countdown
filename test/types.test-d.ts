/**
 * Compile-time tests. These pin the public type surface — `npm run typecheck`
 * failing is the failure signal.
 */
import { Countdown, defaultOptions, toDate } from '../src/countdown.js';
import type {
  ICountdownContext,
  TDateInput,
  TDiff,
  TOptions,
  TUserOptions,
} from '../src/types.js';

declare const el: HTMLElement;

// `this` inside function options is the countdown, not the options object
new Countdown(el, {
  render(diff) {
    const total: number = diff.total;
    this.el.innerHTML = `${this.leadingZeros(diff.min)}:${this.leadingZeros(
      diff.sec,
    )}`;
    const running: boolean = this.running;
    const refresh: number = this.options.refresh;
    void [total, running, refresh];
  },
  onEnd() {
    this.el.innerHTML = 'done';
  },
});

// arrow functions keep the outer `this` and must still be accepted
new Countdown(el, {
  render: (diff: TDiff) => void diff.sec,
  onEnd: () => undefined,
});

// date accepts everything the Date constructor does
const dates: TDateInput[] = [new Date(), '2026-08-23T00:00:00Z', 1234567890];
for (const date of dates) new Countdown(el, { date });

// public surface
const c = new Countdown(el);
const chained: Countdown = c.update(new Date()).updateOffset(0).stop().start();
const restarted: Countdown = c.restart({ refresh: 500 });
const diff: TDiff = c.getDiffDate();
const resolved: TOptions = c.options;
const context: ICountdownContext = c;
const host: HTMLElement = c.el;
const running: boolean = c.running;
const finished: boolean = c.finished;
const padded: string = c.leadingZeros(7, 3);
c.destroy();

const opts: TUserOptions = { refresh: 0, offset: 100 };
const parsed: Date = toDate('2026-01-01');
const defaultRefresh: number = defaultOptions.refresh;

void [
  chained,
  restarted,
  diff,
  resolved,
  context,
  host,
  running,
  finished,
  padded,
  opts,
  parsed,
  defaultRefresh,
];

// @ts-expect-error refresh must be a number
new Countdown(el, { refresh: 'fast' });
// @ts-expect-error offset must be a number
new Countdown(el, { offset: '5s' });
// @ts-expect-error unknown options are rejected
new Countdown(el, { totallyUnknown: 1 });
// @ts-expect-error a boolean is not a valid date
new Countdown(el, { date: true });
// @ts-expect-error the element is required
new Countdown();
