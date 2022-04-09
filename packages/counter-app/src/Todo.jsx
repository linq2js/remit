import { useMemo } from "react";
import { create, useModel } from "remos";

let id = 0;
const $todo = create({
  filter: "all",
  todos: {},
  add(title) {
    this.todos = {
      ...this.todos,
      [id++]: { id, title, done: false },
    };
  },
  remove(id) {
    const { [id]: _, ...others } = this.todos;
    this.todos = others;
  },
  toggle(id) {
    const { [id]: todo, ...others } = this.todos;
    others[id] = { ...todo, done: !todo.done };
    this.todos = others;
  },
});

const FilterItem = ({ filter }) => {
  const selected = useModel($todo, (x) => x.filter);
  return (
    <label>
      <input
        type="radio"
        value="all"
        checked={selected === filter}
        onChange={() => ($todo.filter = filter)}
      />
      {filter.toUpperCase()}
    </label>
  );
};

const FilterBar = () => (
  <div>
    <FilterItem filter="all" />
    <FilterItem filter="completed" />
    <FilterItem filter="incompleted" />
  </div>
);

const TodoItem = ({ id, title, done }) => (
  <div>
    <input type="checkbox" checked={done} onChange={() => $todo.toggle(id)} />
    <span style={{ textDecoration: done ? "line-through" : "" }}>{title}</span>
    <button onClick={() => $todo.remove(id)}>x</button>
  </div>
);

const TodoList = () => {
  const { todos, filter } = useModel(
    $todo,
    (x) => ({ filter: x.filter, todos: x.todos }),
    "shallow"
  );
  const filtered = useMemo(() => {
    const items = Object.values(todos);
    if (filter === "all") return items;
    if (filter === "completed") return items.filter((x) => x.done);
    return items.filter((x) => !x.done);
  }, [filter, todos]);
  return (
    <div>
      {filtered.map((x) => (
        <TodoItem key={x.id} {...x} />
      ))}
    </div>
  );
};

const TodoInput = () => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      $todo.add(e.target.value);
      e.target.value = "";
    }}
  >
    <input name="title" placeholder="Enter title..." />
  </form>
);

const TodoApp = () => (
  <>
    <TodoInput />
    <FilterBar />
    <TodoList />
  </>
);
