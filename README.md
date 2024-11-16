# pkgman

A minimal example showing how to recursively resolve packages from npm.

Running:

```sh
node --experimental-strip-types run.ts
```

## Todo

1. Get dependencies & desired versions
2. Get deps of deps (repeat)
3. Figure out which versions we want
4. Stick them in
5. Print any errors

Example output (`pkgman_modules`)

```sh
$ tree pkgman_modules/                                                                                                                  (git)-[main]-
pkgman_modules/
├── js-tokens
│   ├── LICENSE
│   ├── README.md
│   ├── index.d.ts
│   ├── index.js
│   └── package.json
├── loose-envify
│   ├── LICENSE
│   ├── README.md
│   ├── cli.js
│   ├── custom.js
│   ├── index.js
│   ├── loose-envify.js
│   ├── package.json
│   ├── pkgman_modules
│   │   └── js-tokens
│   │       ├── CHANGELOG.md
│   │       ├── LICENSE
│   │       ├── README.md
│   │       ├── index.js
│   │       └── package.json
│   └── replace.js
└── react
    ├── LICENSE
    ├── README.md
    ├── cjs
    │   ├── react-jsx-dev-runtime.development.js
    │   ├── react-jsx-dev-runtime.production.min.js
    │   ├── react-jsx-dev-runtime.profiling.min.js
    │   ├── react-jsx-runtime.development.js
    │   ├── react-jsx-runtime.production.min.js
    │   ├── react-jsx-runtime.profiling.min.js
    │   ├── react.development.js
    │   ├── react.production.min.js
    │   ├── react.shared-subset.development.js
    │   └── react.shared-subset.production.min.js
    ├── index.js
    ├── jsx-dev-runtime.js
    ├── jsx-runtime.js
    ├── package.json
    ├── react.shared-subset.js
    └── umd
        ├── react.development.js
        ├── react.production.min.js
        └── react.profiling.min.js

```
