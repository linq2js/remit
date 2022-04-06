import "./App.css";
import { useModel, inject } from "remos";
import { withImmer } from "remos-immer";

inject(withImmer());

const originalArray = [] as number[];

const App = () => {
  const model = useModel(() => ({
    count: 1,
    array: originalArray,
    increment() {
      this.array.push(this.count);
    },
  }));
  return (
    <h1 onClick={model.increment}>
      {model.array.length} {originalArray.length}
    </h1>
  );
};

export default App;
