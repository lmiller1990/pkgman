import fs from "fs-extra";
import semver from "semver";
import { pipeline } from "node:stream/promises";
import * as tar from "tar";

async function getMaxSatisfies(dep: string, vers: string, depth = 0) {
  console.log();
  console.log(`${"  ".repeat(depth)}${dep}@${vers}`);
  const meta = await fetchMetadata(dep);
  const versions = Object.keys(meta["versions"]);
  const max = semver.maxSatisfying(versions, vers as string)!;
  console.log(`${"  ".repeat(depth)}Best match => ${max}`);
  const nestedDeps = meta.versions[max].dependencies ?? {};

  console.log(`${"  ".repeat(depth + 1)}Deps => ${Object.keys(nestedDeps)}`);

  await getDependencies(nestedDeps, depth + 1);
}

async function getDependencies(deps: Record<string, string>, depth = 0) {
  // console.log(deps);
  for (const [dep, vers] of Object.entries(deps)) {
    await getMaxSatisfies(dep, vers as string, depth);
  }
}

const reg = "https://registry.npmjs.org";

async function fetchMetadata(lib: string) {
  const res = await globalThis.fetch(`${reg}/${lib}`);
  const data = await res.json();
  return data;
}

async function downloadTar(link: string, to: string) {
  const res = await globalThis.fetch(link);
  await pipeline(res.body!, fs.createWriteStream("out.tgz"));
  await tar.x({ f: "out.tgz", C: "/tmp" });
  await fs.move("/tmp/package", `./pkgman_modules/${to}`);
}

const react = await fetchMetadata("react");

// downloadTar(react.versions["18.3.1"]["dist"]["tarball"], "react");
const pkgmanJson = JSON.parse(await fs.readFile("./pkgman.json", "utf-8"));
const deps = pkgmanJson.dependencies;

await getDependencies(deps);
