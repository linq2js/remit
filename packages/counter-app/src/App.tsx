import "./App.css";
import { useModel, create } from "remos";

const counterBase = create({
  count: 1,
  increment() {
    this.count++;
  },
});

const counter1 = counterBase.$extend();
const counter2 = counterBase.$extend();

const Buttons = () => (
  <p>
    <button onClick={counter1.increment}>Increment 1</button>
    <button onClick={counter2.increment}>Increment 2</button>
  </p>
);

const ValueOf = ({
  model,
  name,
}: {
  model: typeof counterBase;
  name: string;
}) => {
  useModel(model);

  return (
    <p>
      {name}: {model.count} {Date.now()}
    </p>
  );
};

const IsCounter1GreaterThanCounter2 = () => {
  const value = useModel([counter1, counter2], (c1, c2) => c1.count > c2.count);

  return (
    <p>
      {value.toString()} {Date.now()}
    </p>
  );
};

const App = () => {
  return (
    <>
      <Buttons />
      <ValueOf model={counter1} name="Counter 1" />
      <ValueOf model={counter2} name="Counter 2" />
      <IsCounter1GreaterThanCounter2 />
    </>
  );
};

export default App;
