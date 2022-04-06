# remos-immer

An Immer wrapper for Remos

## Installation

**NPM**

```bash
npm i remos-immer --save
```

**YARN**

```bash
yarn add remos-immer
```

## Usages

With remos-immer

```js
import { create, configure } from "remos";
import { immerWrapper } from "remos-immer";

configure({
  wrap: [immerWrapper],
});

const todoModel = create({
  todos: [],
  add(todo) {
    this.todos.push(todo);
  },
  remove(id) {
    const index = this.todos.findIndex((x) => x.id === id);
    this.todos.splice(index, 1);
  },
});
```

Without remos-immer

```js
import { create, configure } from "remos";

const todoModel = create({
  todos: [],
  add(todo) {
    this.todos = [...this.todos, todo];
  },
  remove(id) {
    const index = this.todos.findIndex((x) => x.id === id);
    this.todos = [
      ...this.todos.slice(0, index),
      ...this.todos.slice(index + 1),
    ];
  },
});
```
