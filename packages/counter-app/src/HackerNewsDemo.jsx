import { Suspense, useState } from "react";
import { async, create, sync, useModel } from "remos";

const loadDataApi = (url) => fetch(url).then((res) => res.json());
const loadTopStories = () =>
  loadDataApi("https://hacker-news.firebaseio.com/v0/topstories.json");

const storyLoader = (id) => () =>
  loadDataApi(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);

const $topStories = create({
  ...async(),
  page: 0,
  total: 0,
  size: 10,
  items: [],
  onInit() {
    this.load(loadTopStories);
  },
  onSuccess() {
    this.onSizeChange();
    this.onPageChange();
  },
  onSizeChange() {
    // update total pages
    this.total = Math.ceil(this.data.length / this.size);
  },
  onPageChange() {
    const index = this.page * this.size;
    this.items = this.data.slice(index, index + this.size);
  },
  next() {
    if (!this.total || this.page >= this.total) return;
    this.page++;
  },
  prev() {
    if (!this.total || !this.page) return;
    this.page--;
  },
});

const $story = create(
  {
    ...async(),
    id: 0,
    onInit() {
      if (!this.id) return;
      this.load(storyLoader(this.id));
    },
  },
  "id"
);

const Story = ({ id }) => {
  const { loading, data } = useModel($story.$family(id));
  const [showComments, setShowComments] = useState(false);
  return (
    <li>
      <p>
        {loading && "Loading..."}
        {data && (
          <div>
            {data.title && (
              <div>
                <a href={data.url} target="_blank" rel="noopener noreferrer">
                  {data.title}
                </a>
              </div>
            )}
            {data.text && (
              <span dangerouslySetInnerHTML={{ __html: data.text }} />
            )}
            <div>
              {!!data.score && <>{data.score} points by </>}
              <a
                href={`https://news.ycombinator.com/user?id=${data.by}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {data.by}
              </a>
            </div>
            {!!data.kids?.length && (
              <div>
                {!showComments && (
                  <button onClick={() => setShowComments(true)}>
                    Comments ({data.kids.length})
                  </button>
                )}
                {showComments && (
                  <ul>
                    {data.kids.map((x) => (
                      <Story id={x} key={x} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </p>
    </li>
  );
};

const TopStories = () => {
  const { items, total, page, prev, next } = useModel(
    $topStories,
    (x) => {
      // make sure the model is loaded
      sync(x);
      // select needed values
      return {
        total: x.total,
        page: x.page,
        items: x.items,
        next: x.next,
        prev: x.prev,
      };
    },
    // using shaloww compare
    "shallow"
  );

  return (
    <>
      <h1>Hacker News</h1>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={prev} disabled={!page}>
          Prev
        </button>
        {page + 1} / {total}
        <button onClick={next} disabled={page >= total - 1}>
          Next
        </button>
      </div>
      <ul>
        {items.map((id) => (
          <Story id={id} key={id} />
        ))}
      </ul>
    </>
  );
};

export default function App() {
  return (
    <div className="App">
      <Suspense fallback="Loading...">
        <TopStories />
      </Suspense>
    </div>
  );
}
