import "./App.css";
import { useModel } from "remos";
const App = () => {
  const model = useModel(() => ({ count: 1 }));
  return <h1 onClick={() => model.count++}>{model.count}</h1>;
};

export default App;