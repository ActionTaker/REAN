import { test } from "node:test";
import assert from "node:assert/strict";
import { compareToEstimates } from "./estimate-compare";

test("average, range and gap of outside estimates", () => {
  const r = compareToEstimates(["300000", "320000", "0", ""], "331000");
  assert.equal(r.count, 2);
  assert.equal(r.average!.toString(), "310000");
  assert.equal(r.low!.toString(), "300000");
  assert.equal(r.high!.toString(), "320000");
  assert.equal(r.gap!.toFixed(4), "0.0677");
  assert.equal(compareToEstimates([], "1").average, null);
});
