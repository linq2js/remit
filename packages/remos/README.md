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

1. [x] Simple setup
2. [x] No provider required
3. [x] No boilerplate
4. [x] Model inheritance supported
5. [x] Nested model supported
6. [x] Model injection supported
7. [x] Fully Typescript supoorted
8. [x] Immer supported
9. [x] Memoized data supported
10. [x] Model family supported
11. [ ] Redux Devtools supported

## Counter App

```js
import { useModel } from "remos";
const App = () => {
  const model = useModel({ count: 1 });
  return <h1 onClick={() => model.count++}>{model.count}</h1>;
};
```

## Recipes

### Creating simple model

```js
import { create } from "remos";
const counter = create({ count: 1 });
counter.count++; // update count prop
```

### Connecting model to React component

```js
import { create, useModel } from "remos";
const counter = create({ count: 1 });

const App = () => {
  useModel(counter);
  return <h1>{counter.count}</h1>;
};
```

### Selecting single model prop

It detects changes with strict-equality (old === new) by default, this is efficient for atomic state picks.

```js
import { create, useModel } from "remos";
const counter = create({ count: 1 });
const App = () => {
  const count = useModel(counter, (props) => props.count);
  return <h1>{count}</h1>;
};
```

### Selecing multiple model props

For more control over re-rendering, you may provide an alternative equality function on the thrid argument.

```js
import { create, useModel } from "remos";
const user = create({ firstName: "", lastName: "", age: 50 });
const App = () => {
  const result = useModel(
    user,
    (props) => (
      {
        firstName: props.firstName,
        lastName: props.lastName,
      },
      // use shallow compare or pass custom equality function here
      "shallow"
    )
  );

  return (
    <h1>
      {result.firstName} {result.lastName}
    </h1>
  );
};
```

### Handling multiple model updates

```js
const App = () => {
  // the component will be re-rendered whenever model1, model2, model3 are updated
  useModel([model1, model2, model3]);
  return <></>;
};
```

### Selecting props from multiple models

```js
const author = create({ name: "Bill" });
const article = create({ title: "React basis" });
const App = () => {
  const result = useModel(
    { author, article },
    (props) =>
      `The article ${props.article.title} is written by ${props.author.name}`
  );
  const { authorName, articleTitle } = useModel(
    { author, article },
    (props) => ({
      authorName: props.author.name,
      articleTitle: props.article.title,
    }),
    "shallow" // using shallow compare if the selector returns complex object
  );
  return <div>{result}</div>;
};
```

## Addons

1. [remos-immer](https://www.npmjs.com/package/remos-immer)

## API References

https://linq2js.github.io/remos/
