// ESM consumer, compiled against the packed tarball rather than the source
// tree — the only way to catch declaration bugs the in-repo build cannot see.
import C, { Countdown, defaultOptions, toDate } from 'easy-countdown';
import { registerJQueryPlugin } from 'easy-countdown/jquery';
import type {
  ICountdownContext,
  TDateInput,
  TDiff,
  TOptions,
  TUserOptions,
} from 'easy-countdown';

declare const el: HTMLElement;

// the default export is the class itself, not a namespace
const countdown: Countdown = new C(el, { date: '2087-06-07T15:03:25Z' });
const named: Countdown = new Countdown(el);

// the documented render callback, with `this` bound to the instance
new Countdown(el, {
  date: new Date(),
  refresh: 1000,
  render(diff) {
    this.el.innerHTML = `${this.leadingZeros(diff.hours)}:${this.leadingZeros(
      diff.min,
    )}:${this.leadingZeros(diff.sec)}`;
  },
  onEnd() {
    this.el.innerHTML = 'Done';
  },
});

const diff: TDiff = countdown.getDiffDate();
const resolved: TOptions = countdown.options;
const context: ICountdownContext = countdown;
const parsed: Date = toDate('2026-01-01');
const inputs: TDateInput[] = [new Date(), '2026-01-01', 0];
const opts: TUserOptions = { refresh: 0, offset: 10 };
const refresh: number = defaultOptions.refresh;

registerJQueryPlugin({});

// options are genuinely typed, not silently `any`
// @ts-expect-error refresh must be a number
new Countdown(el, { refresh: 'fast' });
// @ts-expect-error unknown options are rejected
new Countdown(el, { totallyUnknown: 1 });

export { countdown, named, diff, resolved, context, parsed, inputs, opts, refresh };
