import { useModel } from "remos";

const notEmpty = (x) => !!x;

const Field = ({ model, field, rule, message }) => {
  const value = useModel(model, (x) => x[field]);
  return (
    <div>
      <label>{field}</label>
      <input value={value} onChange={(e) => (model[field] = e.target.value)} />
      {/*   using $touched method to detect the field is whether changed ot not,
            no matter its value changes to default value.
            You can use $dirty() to detech the field value is different with default value
        */}
      {model.$touched(field) && rule && !rule(value) && (
        <div style={{ color: "red" }}>{message}</div>
      )}
    </div>
  );
};

const Form = () => {
  // create a local model with specified props and their initial values
  const model = useModel({ username: "", password: "" });
  const handleClick = () =>
    alert(`${model.username || "--"} / ${model.password || "--"}`);
  return (
    <>
      <h1>Login</h1>
      <Field
        model={model}
        field="username"
        rule={notEmpty}
        message="Username cannot be empty"
      />
      <Field
        model={model}
        field="password"
        rule={notEmpty}
        message="Password cannot be empty"
      />
      <button onClick={handleClick}>Submit</button>
    </>
  );
};

export default function App() {
  return (
    <div className="App">
      <Form />
    </div>
  );
}
