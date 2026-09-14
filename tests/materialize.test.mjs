import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePackage } from "../scripts/materialize.mjs";
const pkg = (name) => ({
  client: "Acme",
  artifacts: [{ name, kind: "document", content: "hello" }],
});
test("workspace filenames cannot escape destination", () => {
  for (const name of [
    "../outside.txt",
    "C:\\outside.txt",
    "a/b.txt",
    "CON.txt",
    "file.",
  ])
    assert.throws(() => validatePackage(pkg(name)));
});
test("valid portable filenames are accepted", () =>
  assert.doesNotThrow(() => validatePackage(pkg("Kickoff handoff.md"))));
test("case-insensitive duplicate filenames rejected", () => {
  const p = pkg("Brief.md");
  p.artifacts.push({ ...p.artifacts[0], name: "brief.md" });
  assert.throws(() => validatePackage(p), /Duplicate/);
});
