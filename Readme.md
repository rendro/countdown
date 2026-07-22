# easy-countdown

> Simple, lightweight and easy to use countdown plugin

[![CI](https://github.com/rendro/countdown/actions/workflows/ci.yml/badge.svg)](https://github.com/rendro/countdown/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/easy-countdown.svg)](https://www.npmjs.com/package/easy-countdown)

- no dependencies — jQuery is optional
- you control the markup: rendering is a callback
- written in TypeScript, ships its own types
- ESM + CJS + UMD builds, ~1.2 kB gzipped

## Install

```sh
npm install easy-countdown
```

## Usage

```js
import { Countdown } from 'easy-countdown';

new Countdown(document.querySelector('.countdown'), {
  date: '2087-06-07T15:03:25Z',
  render(diff) {
    this.el.innerHTML =
      `${this.leadingZeros(diff.hours)}:` +
      `${this.leadingZeros(diff.min)}:` +
      `${this.leadingZeros(diff.sec)}`;
  },
  onEnd() {
    this.el.innerHTML = 'Time is up';
  },
});
```

It starts automatically. Via a script tag, the UMD bundle exposes a global
`Countdown`:

```html
<script src="node_modules/easy-countdown/dist/countdown.min.js"></script>
<script>
  new Countdown(document.querySelector('.countdown'), { date: '2087-06-07' });
</script>
```

### jQuery

```html
<script src="jquery.js"></script>
<script src="node_modules/easy-countdown/dist/jquery.countdown.min.js"></script>
<script>
  $('.countdown').countdown({ date: '2087-06-07T15:03:25Z' });

  // the instance lives on the element's data
  $('.countdown').data('countdown').update('2099-01-01');

  // tear it down
  $('.countdown').countdown('destroy');
</script>
```

The plugin never touches the global `$`, so it works under
`jQuery.noConflict()`. As a module, when jQuery is not a global:

```js
import { registerJQueryPlugin } from 'easy-countdown/jquery';
import $ from 'jquery';

registerJQueryPlugin($);
```

The date can also come from the element. It wins over the `date` option, so one
call can configure many elements with their own dates — the same ordering 2.x
used:

```html
<div class="countdown" data-date="2087-06-07T15:03:25Z"></div>
```

## Dates

Pass a `Date`, a timestamp, or a string. **Prefer ISO 8601** — anything else is
parsed inconsistently across browsers. `"August 23, 2016 24:00:00"` is the
classic trap: V8 rolls hour 24 into the next day, Safari rejects it outright.

Values that cannot be parsed now throw rather than silently counting down to
zero, which used to be indistinguishable from a finished countdown:

```js
new Countdown(el, { date: 'nonsense' });
// TypeError: countdown: invalid date "nonsense". Prefer an ISO 8601 string …
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `date` | `2087-06-07T15:03:25` | When the countdown reaches zero. `Date`, string or timestamp |
| `refresh` | `1000` | Re-render interval in ms. `0` renders once and never repeats |
| `offset` | `0` | Milliseconds added to the remaining time, e.g. to correct clock skew |
| `render` | writes a sentence | `(diff) => void`, called on every tick |
| `onEnd` | — | `() => void`, called once when the countdown reaches zero |

`render` and `onEnd` are bound to the instance, so `this.el`, `this.options`,
`this.running` and `this.leadingZeros()` are available inside them. Arrow
functions keep their own `this`, as usual.

### Decimal seconds

`leadingZeros` takes an optional third argument for decimal places. Only the
integer part is padded, so the field width does not jitter as the fraction
ticks:

```js
render(diff) {
  this.el.textContent =
    this.leadingZeros(diff.sec + diff.millisec / 1000, 2, 2) + ' sec';
  // "07.35 sec"
}
```

Pair it with a small `refresh` — `refresh: 50` or so — otherwise the decimals
only move once a second.

### The diff object

`render` receives, and `getDiffDate()` returns:

| Field | Description |
| --- | --- |
| `years` `days` `hours` `min` `sec` | remaining time, each within its own range |
| `millisec` | `0`–`999` |
| `total` | whole milliseconds remaining; `0` once finished |

## API

| Method | Description |
| --- | --- |
| `start()` | Start ticking. Idempotent — it will not stack intervals |
| `stop()` | Stop ticking, leaving the last output in place |
| `restart(options)` | Apply new options and start again |
| `update(date)` | Point at a new date and re-render. Call `start()` afterwards to resume ticking if it had already finished |
| `updateOffset(ms)` | Adjust the offset |
| `render()` | Render once, now |
| `destroy()` | Stop ticking and release the element |
| `getDiffDate()` | The remaining time. Has no side effects |
| `leadingZeros(num, length?, fractionDigits?)` | Pad with zeros; optionally keep decimal places |
| `running` / `finished` | Getters for the current state |
| `options` / `el` | The resolved options and the host element |

All methods except `destroy()` and `getDiffDate()` return the instance for
chaining.

## Examples

Run `npm run build`, then open `examples/index.html` in a browser.

## Migrating from 2.x

- Distributed as ESM (`dist/countdown.mjs`), CommonJS (`dist/countdown.cjs`)
  and a minified UMD bundle for script tags (`dist/countdown.min.js`). The UMD
  global is still `Countdown`. The npm package is still `easy-countdown`.
- Bower packaging was removed. Install from npm.
- Licensing is MIT only. The 2.x manifest claimed MIT *and* GPL, with no
  LICENSE file in the repo.
- `getDiffDate()` no longer fires `onEnd` as a side effect of being read.
  `render()` owns that now, so inspecting the remaining time is safe.
- `millisec` is now `0`–`999`. It used to be a fraction of a second times 1000.
- The diff object gained `total`.
- Invalid dates throw instead of rendering zeros.
- `leadingZeros` gained a third argument for decimal places.
- New: `destroy()`, `finished`, `running`, and TypeScript types.
- The build output moved to `dist/`. The 2.x `dest/` filenames are still
  published as copies, so existing CDN and `<script src>` URLs keep working.

### Fixed in 3.0

- `onEnd` never fired when the target date was already in the past, or when
  `refresh` was `0` — it was gated on an interval already running.
- `restart()` did not clear the running interval, leaking a timer on each call
  and multiplying the render rate.
- `sec` could render as `60` just under a minute, because it was rounded rather
  than floored.
- The jQuery plugin used the global `$` internally and broke under
  `jQuery.noConflict()`.
- `new Countdown(el)` and `$el.countdown()` threw when no options were given.

## License

MIT
