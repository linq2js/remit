import { useModel, create, sync, async } from "remos";
import { Suspense } from "react";

// utils and API
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// delay API call in 500ms to see loading effect
const loadDataApi = (url) =>
  delay(500).then(() => fetch(url).then((res) => res.json()));
const userListLoader = () =>
  loadDataApi("https://jsonplaceholder.typicode.com/users");
const userInfoLoader = (id) => () =>
  loadDataApi(`https://jsonplaceholder.typicode.com/users/${id}`);

const $userList = create({
  // extend the model with async logic
  // async logic provides common props/methods for async data loading:
  // data, loading, error, load(), cancel()
  ...async(),
  // using _onInit lifecycle to handle first access event
  _onInit() {
    this.load(userListLoader);
  },
});

const $userInfo = create({
  ...async(),
  id: 0,
  // using onChange lifecycle to handle prop changed event
  onChange() {
    // nothing to load
    if (!this.id) return;
    // start loading user info whenever the id prop changed
    // the $memo method works similar React.useMemo hook
    this.$memo(() => this.load(userInfoLoader(this.id)), [this.id]);
  },
});

const UserList = () => {
  // using sync() selector to get the data of the async model synchronously
  // if the model is loading, a promise will be thrown and Suspense component will handle it
  // if the model has an error, an error will be thrown and ErrorBoundary component will handle it
  // refer this link to understand how error boundary works https://reactjs.org/docs/error-boundaries.html
  const users = useModel($userList, sync);
  return (
    <div>
      {users.map((user) => (
        <button key={user.id} onClick={() => ($userInfo.id = user.id)}>
          {user.name} ({user.username})
        </button>
      ))}
    </div>
  );
};

const UserInfo = () => {
  const info = useModel($userInfo, sync);
  if (!info) return <div>Please select the user in the list above</div>;
  return (
    <div style={{ whiteSpace: "pre-wrap" }}>
      {JSON.stringify(info, null, 2)}
    </div>
  );
};

const App = () => {
  return (
    <Suspense fallback="Loading user list...">
      <UserList />
      <Suspense fallback="Loading user info...">
        <UserInfo />
      </Suspense>
    </Suspense>
  );
};

export default App;
