/** Apply the checked-in schema locally. Wrangler records migrations to avoid replay. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import "./sites-env.mjs";
const config = JSON.parse(await readFile("dist/server/wrangler.json", "utf8"));
if (!config.d1_databases?.length)
  throw new Error("Build with the DB binding enabled first.");
const local = {
  name: "launchlane-local-schema",
  compatibility_date: "2026-05-15",
  d1_databases: config.d1_databases.map((d) => ({
    ...d,
    migrations_dir: path.resolve("drizzle"),
  })),
};
await mkdir(".sites-runtime", { recursive: true });
await writeFile(".sites-runtime/db-local.json", JSON.stringify(local, null, 2));
const r = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    ".sites-runtime/db-local.json",
    "--persist-to",
    ".wrangler/state",
  ],
  { stdio: "inherit" },
);
process.exitCode = r.status ?? 1;
