# Changelog

## Version 3.1.0

Fixes found by an adversarial audit of 3.0.1.

### Fixed
* `start()` was a silent no-op once the countdown had ended, so pushing the
  target back into the future with `updateOffset()` rendered a live value once
  and then froze forever. Only `update()` cleared the finished flag. `start()`
  now revives the countdown when there is time on the clock again.
* The jQuery plugin read `data-date` only when creating an instance, so a second
  call over the same selection silently inverted the documented precedence. The
  "re-initialise after new content" pattern the readme encourages therefore
  overwrote each element's own date with the shared one.
* A countdown started through the jQuery plugin leaked its interval when the
  element was removed. `$(el).remove()`, `.empty()` and `.html()` run jQuery's
  `cleanData`, which dropped the data entry without stopping the timer, leaving
  it writing into a detached node with no way to reach the instance. The plugin
  now destroys instances during `cleanData`.
* `leadingZeros(num, length, fractionDigits)` rounded with `toFixed`, so
  59.999 seconds rendered as `60.00` — the impossible value that flooring in
  `getDiffDate` exists to prevent. It truncates now. The readme's own decimal
  example was affected.
* `leadingZeros` padded in front of the minus sign, so `-5` at length 3 gave
  `0-5`. The sign now sits outside the padding.
* `toDate()` returned the caller's own `Date`, so mutating it afterwards moved
  the countdown's target.
* `easy-countdown/jquery` is resolvable for TypeScript consumers on
  `moduleResolution: "node"` via `typesVersions`.

## Version 3.0.1

Compatibility fixes for two things 3.0.0 broke relative to 2.2.0. If you are on
3.0.0, upgrade.

### Fixed
* `data-date` lost to the `date` option in the jQuery plugin. 2.x did
  `if ($el.data('date')) { options.date = $el.data('date'); }`, so the
  attribute won — which is what lets one call configure many elements with
  their own dates. 3.0.0 reversed it, so a shared `date` silently overrode
  every element's attribute. Unlike 2.x the caller's options object is no
  longer mutated, which used to leak the first element's date onto later ones.
* The 2.x `dest/` filenames are published again. 3.0.0 built to `dist/` only,
  which 404s every unpkg / jsDelivr URL and `<script src>` written against
  2.x. `dest/countdown.js`, `dest/countdown.min.js` and the jQuery pair are
  copies of the UMD bundles, and the legacy paths are mapped in `exports` onto
  CommonJS twins so Node deep-requires resolve rather than being parsed as ESM.
* `./package.json` is exported, which some bundlers and test resolvers read.

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
