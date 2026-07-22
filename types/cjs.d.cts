// The UMD bundle sets `module.exports` to the Countdown constructor itself,
// with the other exports hanging off it as statics. That is an `export =`
// shape, which the generated ESM declarations cannot express — hence this
// hand-written declaration for the "require" condition.
//
// The generated declarations are ESM (the package is "type": "module"), so
// reading them from a CommonJS declaration needs an explicit resolution mode.
type TModule = typeof import('../dist/index.js', {
  with: { 'resolution-mode': 'import' }
});

declare const Countdown: TModule['Countdown'] & {
  Countdown: TModule['Countdown'];
  defaultOptions: TModule['defaultOptions'];
  toDate: TModule['toDate'];
};

export = Countdown;
