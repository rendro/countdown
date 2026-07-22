// CommonJS consumer. The UMD bundle sets module.exports to the constructor
// itself, so `import x = require()` must yield the class with the other
// exports hanging off it as statics.
import Countdown = require('easy-countdown');
import registerJQueryPlugin = require('easy-countdown/jquery');

declare const el: HTMLElement;

const c = new Countdown(el, { date: '2087-06-07T15:03:25Z', refresh: 0 });
const days: number = c.getDiffDate().days;
const host: HTMLElement = c.el;
const running: boolean = c.stop().running;

const { defaultOptions, toDate } = Countdown;
const parsed: Date = toDate(defaultOptions.date);

new Countdown(el, {
  render(diff) {
    this.el.textContent = String(diff.sec);
  },
});

registerJQueryPlugin({});

// @ts-expect-error refresh must be a number
new Countdown(el, { refresh: 'fast' });
// @ts-expect-error a boolean is not a valid date
new Countdown(el, { date: true });

export { c, days, host, running, parsed };
