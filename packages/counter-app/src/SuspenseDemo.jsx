import { useModel, create, sync, async } from "remos";
import { Suspense } from "react";

// utils and API
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const loadDataApi = (url) =>
  delay(500).then(() => fetch(url).then((res) => res.json()));
const userListLoader = () =>
  loadDataApi("https://jsonplaceholder.typicode.com/users");
const userInfoLoader = (id) => () =>
  loadDataApi(`https://jsonplaceholder.typicode.com/users/${id}`);

const $userList = create({
  ...async(),
  onInit() {
    // load data at model's first access
    this.load(userListLoader);
  },
});

const $userInfo = create({
  ...async(),
  id: 0,
  onChange() {
    // nothing to load
    if (!this.id) return;
    // start loading user info whenever the id prop changed
    this.$memo(() => this.load(userInfoLoader(this.id)), [this.id]);
  },
});

const UserList = () => {
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
    <div className="App">
      <Suspense fallback="Loading user list...">
        <UserList />
        <Suspense fallback="Loading user info...">
          <UserInfo />
        </Suspense>
      </Suspense>
    </div>
  );
};

export default App;
