import fs from "fs-extra";
import semver from "semver";
import { pipeline } from "node:stream/promises";
import * as tar from "tar";

interface Dep {
  name: string;
  desired: string;
  max: string | undefined;
  parent: Dep;
  deps: Dep[];
}

const reg = "https://registry.npmjs.org";

async function getMaxSatisfies(
  dep: string,
  vers: string,
  depth = 0
): Promise<{ max: string; nested: Record<string, string> }> {
  console.log();
  console.log(`${"  ".repeat(depth)}${dep}@${vers}`);
  const meta = await fetchMetadata(dep);
  const versions = Object.keys(meta["versions"]);
  const max = semver.maxSatisfying(versions, vers as string)!;
  console.log(`${"  ".repeat(depth)}Best match => ${max}`);
  const nested = meta.versions[max].dependencies ?? {};

  console.log(`${"  ".repeat(depth + 1)}Deps => ${Object.keys(nested)}`);

  return {
    max,
    nested,
  };

  // let all = await getDependencies(nestedDeps, depth + 1, parent);
}

async function getDependencies(
  deps: Record<string, string>,
  parent: Dep,
  depth: number
): Promise<Dep[]> {
  for (const [depName, vers] of Object.entries(deps)) {
    const { max, nested } = await getMaxSatisfies(
      depName,
      vers as string,
      depth
    );

    const dep: Dep = {
      name: depName,
      parent,
      desired: vers,
      max,
      deps: [],
    };
    dep.deps = await getDependencies(nested, dep, depth + 1);
    return dep.deps;
  }
}

const pkgmanJson = JSON.parse(await fs.readFile("./pkgman.json", "utf-8"));
const deps = pkgmanJson.dependencies;
const root: Omit<Dep, "desired" | "max" | "parent"> = {
  name: "root",
  deps: [],
};

const moduleGraph = await getDependencies(deps, root as Dep, 0);

console.log(moduleGraph);

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
