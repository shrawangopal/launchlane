import { retrieve } from "../lib/domain.ts";
const cases = [
  ["Who is the accountable contact?", "PB-01"],
  ["What success objectives and audience should the brief describe?", "PB-02"],
  ["Where should website logos and brand guidelines be shared?", "PB-03"],
  ["Which pages need content owners and copy?", "PB-04"],
  ["What creative positioning and visual references are required?", "PB-05"],
  ["Existing brand reference folder link", "PB-06"],
  ["Implementation source destination systems and test environment", "PB-07"],
  ["Sandbox administrator roles and access invitation", "PB-08"],
  ["Can kickoff begin before all required inputs are accepted?", "PB-09"],
  ["Does approving a welcome draft send the email?", "PB-10"],
  ["xylophonemeteorite", null],
  ["antimatterquasars", null],
];
const results = cases.map(([query, expected]) => {
  const hits = retrieve(query);
  return {
    query,
    expected,
    retrieved: hits.map((h) => h.id),
    pass: expected ? hits.some((h) => h.id === expected) : hits.length === 0,
  };
});
const supported = results.filter((r) => r.expected),
  unsupported = results.filter((r) => !r.expected);
console.log(
  JSON.stringify(
    {
      evaluation:
        "Hand-authored playbook retrieval smoke set; not a customer benchmark",
      cases: results.length,
      recallAt4: supported.filter((r) => r.pass).length / supported.length,
      unsupportedQueryAbstention:
        unsupported.filter((r) => r.pass).length / unsupported.length,
      results,
    },
    null,
    2,
  ),
);
if (results.some((r) => !r.pass)) process.exitCode = 1;
