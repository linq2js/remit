import "./App.css";
import { useModel, create, as, of } from "remos";

type FilterType = "all" | "active" | "done";

const $todoList = create({
  _DEVTOOLS_NAME: "todoList",
  // create a family model to store all todo data
  _data: create(
    {
      _DEVTOOLS_NAME: "todoItem",
      id: "",
      title: "",
      done: false,
    },
    "id"
  ),
  ids: as<string[]>([]),
  filter: as<FilterType>("all"),
  doneCount: 0,
  filtered(filter?: FilterType) {
    filter ??= this.filter;

    const ids = this.ids;
    const data = this._data;

    if (filter === "all") {
      return ids;
    }

    return of(this).$memo(
      filter,
      () => {
        return filter === "active"
          ? ids.filter((x) => !data.$family(x).done)
          : ids.filter((x) => data.$family(x).done);
      },
      [this.doneCount]
    );
  },
  add(title: string, done: boolean) {
    const id = Math.random().toString(36);
    this.ids = [...this.ids, id];
    this._data.$family(id).$merge({ title, done });
  },
  toggle(id: string) {
    const old = this._data.$family(id);
    if (old.done) {
      this.doneCount--;
    } else {
      this.doneCount++;
    }
    old.done = !old.done;
  },
  remove(id: string) {
    this.ids = this.ids.filter((x) => x !== id);
    const todo = this._data.$family(id);
    if (todo.done) {
      this.doneCount--;
    } else {
      this.doneCount++;
    }
    todo.$remove();
  },
  update(id: string, title: string) {
    const todo = this._data.$family(id);
    todo.title = title;
  },
  createTodos(count: number) {
    const ids = [...this.ids];
    for (let i = 0; i < count; i++) {
      const id = i.toString();
      ids.push(id);
      this._data.$family(id).$merge({
        title: "Todo " + i,
        done: (Math.random() * 100) % 2 === 0,
      });
    }
    this.ids = ids;
  },
});

const TodoFilter = (props: { type: FilterType; name: string }) => {
  const { filter, count } = useModel(
    $todoList,
    (x) => ({
      filter: x.filter,
      count: x.filtered(props.type).length,
    }),
    "shallow"
  );
  return (
    <button
      style={{ fontWeight: filter === props.type ? "bold" : "normal", flex: 1 }}
      onClick={() => ($todoList.filter = props.type)}
    >
      {props.name} ({count})
    </button>
  );
};

const TodoInput = () => (
  <input
    type="text"
    style={{ padding: "5px 10px" }}
    placeholder="What need to be done?"
    onKeyUp={(e) => {
      if (e.key === "Enter") {
        $todoList.add(e.currentTarget.value, false);
        e.currentTarget.value = "";
      }
    }}
  />
);

const TodoItem = (props: { id: string }) => {
  const todo = useModel($todoList._data.$family(props.id));
  return (
    <div style={{ display: "flex", marginTop: 10 }}>
      <input
        type="checkbox"
        readOnly
        checked={todo.done}
        onClick={() => $todoList.toggle(props.id)}
      />
      <input
        style={{
          flex: 1,
          textDecoration: todo.done ? "line-through" : "none",
          textAlign: "left",
          margin: "0 10px",
        }}
        onChange={(e) => $todoList.update(props.id, e.currentTarget.value)}
        value={todo.title}
      />
      <button onClick={() => $todoList.remove(props.id)}>Remove</button>
    </div>
  );
};

const TodoList = () => {
  const ids = useModel($todoList, (x) => x.filtered());
  if (!ids.length) return <div style={{ marginTop: 10 }}>No todo</div>;
  return (
    <>
      {ids.map((id) => (
        <TodoItem key={id} id={id} />
      ))}
    </>
  );
};

const App = () => {
  return (
    <div
      style={{
        display: "flex",
        width: "300px",
        margin: "20px auto",
        flexDirection: "column",
        justifyContent: "stretch",
      }}
    >
      <TodoInput />
      <div
        style={{
          display: "flex",
          marginTop: 10,
          gap: 10,
        }}
      >
        <TodoFilter type="all" name="All" />
        <TodoFilter type="active" name="Active" />
        <TodoFilter type="done" name="Done" />
      </div>
      <TodoList />
    </div>
  );
};

export default App;
