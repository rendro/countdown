import { Countdown, defaultOptions, toDate } from './countdown.js';

/**
 * UMD entry point. Script-tag users expect `window.Countdown` to be the
 * constructor itself, so the extra exports ride along as static properties
 * rather than sitting on a namespace object.
 */
export default Object.assign(Countdown, {
  Countdown,
  defaultOptions,
  toDate,
});
