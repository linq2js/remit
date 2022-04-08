# remos

React Model Oriented Store

## Installation

**NPM**

```bash
npm i remos --save
```

**YARN**

```bash
yarn add remos
```

## Features

1. Simple APIs
2. No provider required
3. No boilerplate

## Basic Usages

### Counter App (5 lines of code only)

```js
import { useModel } from "remos";
const App = () => {
  const model = useModel({ count: 1 });
  return <h1 onClick={() => model.count++}>{model.count}</h1>;
};
```

### Sharing model between multiple components

```js
import { useModel } from "remos";

function Collapsible({ model, children }) {
  // bind model to the component
  useModel(model);
  // show/hide children if open prop changed
  return model.open ? children : null;
}

function App() {
  // create model for child component
  const $collapsible = useModel(() => ({ open: false }));
  return (
    <>
      {/* the parent component can access or update model which is shared with child components */}
      <button onClick={() => ($collapsible.open = !collapsible.open)}>
        Toggle collapsible
      </button>
      <Collapsible model={$collapsible}>
        This is collapsible content
      </Collapsible>
    </>
  );
}
```

## Advanced Usages

### Model inheritance

```js
import { create } from "remos";

const PoweredDevice = create({
  status: "",
  start() {
    this.status = "power-on";
  },
});

const Scanner = PoweredDevice.$extend({
  scan() {
    console.log("scanning");
  },
});

const Printer = PoweredDevice.$extend({
  print() {
    console.log("printing");
  },
});

const Copier = PoweredDevice.$extend({
  printer: Printer.$clone(),
  scanner: Scanner.$clone(),
  start() {
    this.printer.start();
    this.scanner.start();
  },
});
```

## Addons

1. [remos-immer](https://www.npmjs.com/package/remos-immer)

## API References

https://linq2js.github.io/remos/
