import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidGtin, createStableReader } from "../lib/barcode";

test("real product codes pass the check-digit test", () => {
  for (const c of ["3017620422003", "5449000000996", "8901058852349", "0123456789012", "73513537", "012345678905"]) {
    assert.equal(isValidGtin(c), true, c);
  }
});

test("single-digit errors, wrong lengths and non-digits are rejected", () => {
  assert.equal(isValidGtin("3017620422004"), false);
  assert.equal(isValidGtin("301762042200"), false); // 12 digits but not a valid UPC-A
  assert.equal(isValidGtin("12345"), false);
  assert.equal(isValidGtin("30176204220O3"), false);
  assert.equal(isValidGtin(""), false);
});

test("a code must be read twice in a row; a one-off misread in between resets it", () => {
  const read = createStableReader(2000, 2);
  const t = 1_000_000;
  assert.equal(read("3017620422003", t), false);        // first sighting
  assert.equal(read("3017620422003", t + 100), true);   // confirmed
  const r2 = createStableReader(2000, 2);
  assert.equal(r2("3017620422003", t), false);
  assert.equal(r2("3017620422004", t + 100), false);    // invalid check digit, ignored
  assert.equal(r2("5449000000996", t + 200), false);    // a different valid code starts over
  assert.equal(r2("3017620422003", t + 300), false);    // back to the first: count reset to 1
  assert.equal(r2("3017620422003", t + 400), true);
  const r3 = createStableReader(2000, 2);
  assert.equal(r3("3017620422003", t), false);
  assert.equal(r3("3017620422003", t + 5000), false);   // too long ago: not "consecutive"
});
