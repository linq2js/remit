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
  // using onInit lifecycle to handle first access event
  onInit() {
    this.load(userListLoader);
  },
});

const $selectedUser = create({
  id: 0,
});

const $userInfo = create(
  {
    ...async(),
    id: 0,
    // this logic runs once for each family member
    onInit() {
      if (!this.id) return;
      this.load(userInfoLoader(this.id));
    },
  },
  // indicate $userInfo is family model and using id prop as a key
  // at this time, the model has new method $family
  // the $family(key) method returns a member that associated with the key
  "id"
);

const UserList = () => {
  // using sync() selector to get the data of the async model synchronously
  // if the model is loading, a promise will be thrown and Suspense component will handle it
  // if the model has an error, an error will be thrown and ErrorBoundary component will handle it
  // basically, you can handle loading/error statuses inside host component manually:
  // const { loading, error, data } = useModel(asyncModel)
  // refer this link to understand how error boundary works https://reactjs.org/docs/error-boundaries.html
  const users = useModel($userList, sync);
  return (
    <div>
      {users.map((user) => (
        <button key={user.id} onClick={() => ($selectedUser.id = user.id)}>
          {user.name} ({user.username})
        </button>
      ))}
    </div>
  );
};

const UserInfo = () => {
  const id = useModel($selectedUser, (x) => x.id);
  // you will not see loading effect if you select the user that is already loaded
  // with family model, you dont care about how model is cached and focus to the model logic
  // the family key is usually primitive time (string, number, null, undefined, boolean)
  // if you need more than a key, you can use array of key [key1, key2, key3]
  const info = useModel($userInfo.$family(id), sync);
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
