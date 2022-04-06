import "./App.css";
import { useModel, configure } from "remos";
import { immerWrapper } from "remos-immer";

configure({
  wrap: [immerWrapper],
});

const originalArray = [] as number[];

const App = () => {
  const model = useModel(() => ({
    count: 1,
    array: originalArray,
    increment() {
      this.array.push(this.count);
    },
  }));
  return <h1 onClick={model.increment}>{model.array.length}</h1>;
};

export default App;
