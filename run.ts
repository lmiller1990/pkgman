import fs from "fs-extra";
import path from "path";
import semver from "semver";
import { pipeline } from "node:stream/promises";
import * as tar from "tar";

const moduleDirectory = "pkgman_modules";

// Utils
async function fetchMetadataFromRegistry(lib: string) {
  const res = await globalThis.fetch(`${reg}/${lib}`);
  const data = await res.json();
  return data;
}

/**
 * Download a gzipped tar (tgz) from link to specified location.
 */
async function downloadTar(link: string, to: string) {
  const res = await globalThis.fetch(link);
  await pipeline(res.body!, fs.createWriteStream("out.tgz"));
  await tar.x({ f: "out.tgz", C: "/tmp" });
  await fs.move("/tmp/package", to);
  await fs.rm("out.tgz");
}

interface Dependency {
  name: string;
  tarball: string;
  depth: number;
  desired: string;
  max: string | undefined;
  parent?: Dependency;
  deps: Dependency[];
}

const reg = "https://registry.npmjs.org";

/**
 * Get the most appropriate version for a dependency, and return a list of it's own dependencies.
 */
async function getDependencyMetadata(
  dep: string,
  vers: string,
  depth = 0
): Promise<{
  max: string;
  dependencies: Record<string, string>;
  tarball: string;
}> {
  console.log();
  console.log(`${"  ".repeat(depth)}${dep}@${vers}`);
  const meta = await fetchMetadataFromRegistry(dep);
  const versions = Object.keys(meta["versions"]);
  const max = semver.maxSatisfying(versions, vers as string)!;
  console.log(`${"  ".repeat(depth)}Best match => ${max}`);
  const dependencies = meta.versions[max].dependencies ?? {};

  console.log(`${"  ".repeat(depth + 1)}Deps => ${Object.keys(dependencies)}`);

  return {
    max,
    tarball: meta.versions[max].dist.tarball,
    dependencies,
  };
}

async function getDependencies(
  deps: Record<string, string>,
  parent: Dependency | undefined,
  depth: number
): Promise<Dependency[]> {
  return Promise.all(
    Object.entries(deps).map(async ([depName, vers]) => {
      const { max, dependencies, tarball } = await getDependencyMetadata(
        depName,
        vers as string,
        depth
      );

      const dep: Dependency = {
        name: depName,
        depth,
        tarball,
        parent,
        desired: vers,
        max,
        deps: [],
      };
      dep.deps = await getDependencies(dependencies, dep, depth + 1);
      return dep;
    })
  );
}

const pkgmanJson = JSON.parse(await fs.readFile("./pkgman.json", "utf-8"));
const deps = pkgmanJson.dependencies;

function replacer(key: string, value: Dependency) {
  if (key === "parent" && value && typeof value === "object") {
    return value.name;
  }
  return value;
}

function printDependencyTree(root: Dependency) {
  console.log(JSON.stringify(root, replacer, 2));
}

const moduleGraph = await getDependencies(deps, undefined, 0);
// printDependencyTree(root);

// Resolve what and where to put
function walk(deps: Dependency[]) {
  const map: Map<string, Dependency[]> = new Map();
  function traverse(deps: Dependency[]) {
    for (const dep of deps) {
      if (!map.has(dep.name)) {
        map.set(dep.name, [dep]);
      } else {
        map.get(dep.name)!.push(dep);
      }
      traverse(dep.deps);
    }
  }
  traverse(deps);
  return map;
}

// Group them up
const grouped = walk(moduleGraph);

function climb(dep: Dependency, path: string[] = []): string[] {
  if (!dep.parent) {
    // top level
    return [dep.name, ...path];
  } else {
    const p = [dep.name, ...path];
    return climb(dep.parent, p);
  }
}

// console.log(grouped.get("js-tokens")[1]);

// console.log(grouped);
const toFetch: Array<{ dependency: Dependency; outputDir: string }> = [];

for (const [name, versions] of grouped) {
  const [dependency, ...rest] = versions;
  toFetch.push({ dependency, outputDir: path.join(moduleDirectory, name) });
  if (rest.length) {
    console.log("confict in ", name);
    for (const dependency of rest) {
      const outdir = climb(dependency);
      const outputDir = path.join(
        moduleDirectory,
        outdir.join(`/${moduleDirectory}/`)
      );
      console.log("try", outputDir);
      toFetch.push({
        dependency,
        outputDir,
      });
    }
  }
}

// console.log(grouped.get("react")[0].deps[0].deps);

// install from shallow to deepest
toFetch.sort((x, y) => (x.dependency.depth < y.dependency.depth ? -1 : -1));

await fs.rm(moduleDirectory, { recursive: true, force: true });

for (const mod of toFetch) {
  const out = path.join(mod.outputDir);
  console.log(
    `Installing ${mod.dependency.name}@${mod.dependency.max} in ${out}`
  );
  console.log(`Desired directory => ${out}`);
  await downloadTar(mod.dependency.tarball, out);
}
