#!/usr/bin/env node
/** Materialize an exported workspace into a NEW directory. Never overwrites or deletes. */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function validatePackage(data) {
  if (
    !data ||
    typeof data.client !== "string" ||
    !Array.isArray(data.artifacts) ||
    data.artifacts.length > 100
  )
    throw new Error("Invalid Launchlane workspace package.");
  const names = new Set();
  for (const a of data.artifacts) {
    if (
      !a ||
      typeof a.name !== "string" ||
      typeof a.content !== "string" ||
      a.content.length > 1000000 ||
      !["folder", "document", "tasks", "calendar"].includes(a.kind)
    )
      throw new Error("Invalid artifact.");
    if (a.kind === "folder") continue;
    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9 ._-]{0,120}$/.test(a.name) ||
      a.name.includes("..") ||
      /[. ]$/.test(a.name) ||
      /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(a.name)
    )
      throw new Error("Unsafe artifact filename.");
    if (names.has(a.name.toLowerCase()))
      throw new Error("Duplicate artifact filename.");
    names.add(a.name.toLowerCase());
  }
  return data;
}
export async function materialize(data, destination) {
  validatePackage(data);
  const root = path.resolve(destination);
  await mkdir(root, { recursive: false });
  await mkdir(path.join(root, "01-client-inputs"));
  await mkdir(path.join(root, "02-deliverables"));
  await writeFile(
    path.join(root, "workspace.json"),
    JSON.stringify(data, null, 2),
    { flag: "wx" },
  );
  for (const a of data.artifacts.filter((a) => a.kind !== "folder"))
    await writeFile(path.join(root, a.name), a.content, { flag: "wx" });
  return root;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [source, target] = process.argv.slice(2);
  if (!source || !target) {
    console.error(
      "Usage: node scripts/materialize.mjs <exported-package.json> <new-directory>",
    );
    process.exitCode = 1;
  } else {
    try {
      const result = await materialize(
        JSON.parse(await readFile(source, "utf8")),
        target,
      );
      console.log(`Created workspace: ${result}`);
    } catch (e) {
      console.error(e.message);
      process.exitCode = 1;
    }
  }
}
