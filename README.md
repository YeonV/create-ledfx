# create-ledfx

A minimal scaffolding tool for LedFx projects.

## Usage

You can use this package with any of the following commands:

```
npx create-ledfx
```

or

```
yarn create ledfx
```

or

```
npm init ledfx
```

This will print a welcome message and (optionally) run project setup logic if `ledfx.setup.js` is present in the package.

## Custom Setup

To add custom scaffolding logic, create a `ledfx.setup.js` file in this directory. It should export a function that performs your setup steps.

---

MIT License
