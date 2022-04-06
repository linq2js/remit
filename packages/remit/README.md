# remit

## Installation

**NPM**

```bash
npm i remit --save
```

**YARN**

```bash
yarn add remit
```

## Features

1. Simple APIs
2. No provider required
3. No boilerplate

## Basic Usages

### Counter App (5 lines of code only)

```js
import { useModel } from "remit";
const App = () => {
  const model = useModel(() => ({ count: 1 }));
  return <h1 onClick={() => model.count++}>{model.count}</h1>;
};
```

### Sharing model between multiple components

```js
import { useModel } from "remit";

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

## API References

### create(props: Object)

Create a new model that is based on specified props

### useModel(creator: () => Object \[, options: ModelOptions])

### useModel(model: Model \[, options: ModelOptions])

### useModel(models: Model[] \[, options: ModelOptions])

### Model instance
