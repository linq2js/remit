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

## Counter App (5 lines of code) [CodeSandbox](https://codesandbox.io/s/solitary-cherry-5th8g7)

```js
import { useModel } from "remos";
const App = () => {
  const model = useModel({ count: 1 });
  return <h1 onClick={() => model.count++}>{model.count}</h1>;
};
```

## Todo App (68 lines of code) [CodeSandbox](https://codesandbox.io/s/remos-todo-qlqmne)

```jsx
import { create, useModel } from "remos";

let id = 0;
const $todo = create({
  filter: "all",
  todos: {},
  add(title) {
    this.todos = { ...this.todos, [++id]: { id, title } };
  },
  remove(id) {
    const { [id]: removed, ...others } = this.todos;
    this.todos = others;
  },
  toggle(id) {
    const { [id]: todo, ...others } = this.todos;
    others[id] = { ...todo, done: !todo.done };
    this.todos = others;
  },
  filtered() {
    const todos = Object.values(this.todos);
    if (this.filter === "all") return todos;
    if (this.filter === "completed") return todos.filter((x) => x.done);
    return todos.filter((x) => !x.done);
  },
});

const Filter = ({ value }) => {
  const disabled = useModel($todo, (x) => x.filter === value);
  const onClick = () => ($todo.filter = value);
  return (
    <input type="button" onClick={onClick} disabled={disabled} value={value} />
  );
};

const TodoItem = ({ id, title, done }) => (
  <div>
    <button onClick={() => $todo.remove(id)}>x</button>
    <input type="checkbox" checked={done} onChange={() => $todo.toggle(id)} />
    <span style={{ opacity: done ? 0.5 : 1 }}>{title}</span>
  </div>
);

const TodoList = () => {
  const { filtered } = useModel($todo);
  const todoComps = filtered().map((x) => <TodoItem key={x.id} {...x} />);
  return <div>{todoComps}</div>;
};

const App = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    $todo.add(e.target.title.value);
    e.target.title.value = "";
  };
  return (
    <>
      <form onSubmit={handleSubmit}>
        <input name="title" placeholder="Enter title..." />
      </form>
      <div>
        <Filter value="all" />
        <Filter value="completed" />
        <Filter value="incompleted" />
      </div>
      <TodoList />
    </>
  );
};
```

## Recipes

### Creating simple model

```js
import { create } from "remos";
// create a model with specified props
// the created model has binded properties
// when binded property changed, the change listeners will be called
const counter = create({ count: 1 });
// register change listener
counter.$listen(() => console.log("changed"));
counter.count++; // update count prop
```

### Connecting model to React component

```js
import { create, useModel } from "remos";

const counter = create({ count: 1 });

const App = () => {
  // bind the model to the component
  // when model is changed, the component re-renders
  useModel(counter);
  return <h1>{counter.count}</h1>;
};
```

### Selecting single model prop

It detects changes with strict-equality (old === new) by default.

```js
import { create, useModel } from "remos";
const counter = create({ count: 1, other: 2 });
const App = () => {
  // select only count prop value
  // that means the component will re-render when count prop change only
  // nothing happens if other prop is changed
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
