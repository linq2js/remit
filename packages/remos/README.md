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
  const model = useModel(() => ({ count: 1 }));
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

### create(props: Object)

Create a new model that is based on specified props

```js
import { create } from "remos";

const counterModel = create({ count: 1 });
console.log(counterModel.count); // 1
counterModel.count++;
console.log(counterModel.count); // 2
```

### useModel(creator: () => Object \[, options: ModelOptions])

Create a local model. The model use to share with child components. When model is updated, the host component will be re-rendered

```jsx
import { useModel } from "remos";

function CounterValue({ model }) {
  return <div>{model.count}</div>;
}

function IncrementButton({ model }) {
  return <button onClick={() => model.count++}>+</button>;
}

function App() {
  // when the model is changed, the App will re-render
  const model = useModel(() => ({ count: 1 }));

  return (
    <>
      <CounterValue model={model} />
      <IncrementButton model={model} />
    </>
  );
}
```

### useModel(model: Model \[, options: ModelOptions])

Bind a specified model to the host compoent. When model is updated, the host component will be re-rendered

```jsx
import { useModel, create } from "remos";

const counterModel = create({ count: 1 });

function CounterValue() {
  // this component need to be re-rendered whenever count value is changed
  useModel(counterModel);
  return <div>{counterModel.count}</div>;
}

function IncrementButton() {
  // we dont need to bind counterModel to the host component
  // because this component just updates model, no value need to be rendered
  return <button onClick={() => counterModel.count++}>+</button>;
}

function App() {
  return (
    <>
      <CounterValue />
      <IncrementButton />
    </>
  );
}
```

### useModel(models: Model[] \[, options: ModelOptions])

This hook works likely useModel(model) overload but it is for multiple models binding

### inject(...injectors)

Register injector that will be called at creating phase

```js
import { inject, create } from "remos";

inject((modelApi) => {
  modelApi.$listen(() => console.log("model changed"));
});

const counterModel = create({ count: 1 });
counterModel.count++; // model changed
counterModel.count++; // model changed
```

### Model API

#### $clone()

#### $extend()

#### $reset()

#### $watch()

#### $assign()

#### $batch()

#### $watch()

#### $when()

#### $wrap(wrapper), $wrap(wrappers)

#### $observe(observer), $observe(observers)

### Model Lifecycles

```js
import { create } from "remos";

const counterModel = create({
  count: 1,
  onCreate: () => console.log("create"),
  onInit: () => console.log("init"),
  onChange: () => console.log("change"),
  onConnect: () => console.log("connect"),
  onDisconnect: () => console.log("disconnect"),
});

// onCreate()
counterModel.count++; // oninit() => onChange()
const unsubscribe = counterModel.listen(() => {}); // onConnect()
unsubscribe(); // onDisconnect()
```
