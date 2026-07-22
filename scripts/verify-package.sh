#!/usr/bin/env bash
#
# Verify the published artifact rather than the source tree.
#
# Packs the package, installs the tarball into a throwaway project, then
# typechecks a real consumer against it under every module resolution mode with
# skipLibCheck OFF, and smoke-tests both require() and import at runtime.
#
# This exists because three separate defects — exported types silently
# degrading to `any`, the ESM default import resolving to a namespace, and
# callbacks not being typed as bound — were all invisible to `npm run build`
# and `npm run typecheck`, and only appeared from a consumer's point of view.
#
# Usage: npm run verify:package   (assumes `npm run build` has already run)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cd "$ROOT"
TARBALL="$(npm pack --pack-destination "$WORK" --silent | tail -n 1)"
echo "packed $TARBALL"

cd "$WORK"
printf '{"name":"consumer","version":"1.0.0","private":true}\n' > package.json
cp "$ROOT"/scripts/package-fixtures/use.cts .
cp "$ROOT"/scripts/package-fixtures/use.mts .

# install the tarball, and typescript from the package's own devDependency
TS_VERSION="$(node -p "require('$ROOT/package.json').devDependencies.typescript")"
npm install --no-audit --no-fund --silent "$WORK/$TARBALL" "typescript@$TS_VERSION"

status=0

# skipLibCheck is deliberately OFF: with it on, unresolvable declarations fail
# silently and every exported type degrades to `any`.
for mode in node16 nodenext; do
  echo "--- typecheck: module=$mode moduleResolution=$mode (skipLibCheck off)"
  if ! npx tsc --noEmit --strict --module "$mode" --moduleResolution "$mode" \
      --lib ES2022,DOM use.cts use.mts; then
    status=1
  fi
done

echo "--- typecheck: moduleResolution=bundler (skipLibCheck off)"
if ! npx tsc --noEmit --strict --module esnext --moduleResolution bundler \
    --lib ES2022,DOM use.mts; then
  status=1
fi

echo "--- runtime: require()"
node -e "
const assert = require('assert');
const C = require('easy-countdown');
assert.strictEqual(typeof C, 'function', 'CJS export should be the constructor');
assert.strictEqual(C.name, 'Countdown');
for (const k of ['Countdown', 'defaultOptions', 'toDate']) {
  assert.ok(k in C, 'missing static: ' + k);
}
assert.strictEqual(typeof require('easy-countdown/jquery'), 'function');
console.log('    ok');
" || status=1

echo "--- runtime: import"
node --input-type=module -e "
import assert from 'assert';
import C, { Countdown, defaultOptions } from 'easy-countdown';
import { registerJQueryPlugin } from 'easy-countdown/jquery';
assert.strictEqual(C, Countdown, 'default export should be the class');
assert.strictEqual(typeof registerJQueryPlugin, 'function');
assert.strictEqual(defaultOptions.refresh, 1000);
console.log('    ok');
" || status=1

echo "--- runtime: callbacks are bound, onEnd fires, invalid dates throw"
node --input-type=module -e "
import assert from 'assert';
import { Countdown, toDate } from 'easy-countdown';
const el = { innerHTML: '' };
let seen;
new Countdown(el, { date: new Date(Date.now() + 60000), refresh: 0, render() { seen = this.el; } });
assert.strictEqual(seen, el, 'this.el inside render should be the host element');

let ended = false;
new Countdown(el, { date: new Date(Date.now() - 1000), refresh: 0, render() {}, onEnd() { ended = true; } });
assert.ok(ended, 'onEnd should fire for an already-past date');

assert.throws(() => toDate('nonsense'), /invalid date/);

const c = new Countdown(el, { date: new Date(Date.now() + 59700), refresh: 0, render() {} });
assert.strictEqual(c.getDiffDate().sec, 59, 'sec must never round up to 60');
console.log('    ok');
" || status=1

if [ "$status" -ne 0 ]; then
  echo
  echo "package verification FAILED — the published artifact would be broken for consumers"
  exit 1
fi

echo
echo "package verification passed"
