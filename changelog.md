# Changelog

## Version 3.0.0

Rewritten in TypeScript; built with Vite, tested with Vitest. The
browserify/uglify/bower toolchain is gone and there are no runtime
dependencies — jQuery is optional.

### Breaking
* Removed Bower packaging (`bower.json`).
* Licensing is MIT only. The 2.x manifest claimed MIT *and* GPL, with no
  LICENSE file in the repo; there is one now.
* `getDiffDate()` no longer fires `onEnd` as a side effect of being read.
  `render()` owns that, so inspecting the remaining time is free of surprises.
* `millisec` is now `0`–`999`. It used to be a fraction of a second times 1000.
* Invalid dates throw instead of rendering as all zeros.
* ESM builds are `*.mjs`, the CommonJS build is `*.cjs`, and the minified UMD
  bundle for script tags stays `*.min.js`.

### Added
* TypeScript declarations shipped with the package.
* `destroy()`, and `running` / `finished` getters.
* `total` on the diff object — whole milliseconds remaining.
* `$('…').countdown('destroy')` and `registerJQueryPlugin($)`.
* `leadingZeros(num, length, fractionDigits)` — decimal places, padding only
  the integer part so the field width stays stable. The obvious approach,
  `leadingZeros(sec).toFixed(2)`, could never work: it returns a string. (#25)

### Fixed
* `onEnd` never fired when the target date was already in the past, or when
  `refresh` was `0`: it was gated on an interval already running. (#33)
* `restart()` did not clear the running interval, so every call leaked a timer
  and multiplied the render rate.
* `sec` could render as `60` just under a minute — it was rounded, not floored.
* The jQuery plugin referenced the global `$` internally, so it broke under
  `jQuery.noConflict()`. (#19)
* `new Countdown(el)` and `$el.countdown()` threw when given no options.
* An unparseable date rendered as all zeros, indistinguishable from a finished
  countdown. It now throws with a message naming the value and pointing at
  ISO 8601. (#32)
* `restart()` re-bound already-bound callbacks, nesting another wrapper on
  every call. Binding now happens against the caller's original function.

## Version 2.2.0
* Added restart API method
