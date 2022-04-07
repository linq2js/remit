import { create } from "./main";

test("data:should not contain any method or $key", () => {
  const model = create({
    $key: 1,
    count: 1,
    increment() {
      this.count++;
    },
  });
  expect(model.$data).toEqual({ count: 1 });
});

test("lifecycle:create", () => {
  const model = create({
    count: 1,
    onCreate() {
      this.count++;
    },
  });
  expect(model.count).toBe(2);
});

test("lifecycle:init", () => {
  let initialized = false;
  const model = create({
    count: 1,
    onInit() {
      initialized = true;
    },
  });
  expect(initialized).toBe(false);
  // first access
  model.count;
  expect(initialized).toBe(true);
});

test("lifecycle:subscribe/unsubscribe", () => {
  let status = "";
  const model = create({
    count: 1,
    onSubscribe() {
      status = "subscribe";
    },
    onUnsubscribe() {
      status = "unsubscribe";
    },
  });
  expect(status).toBe("");
  const unsubscribe = model.$listen(() => {});
  expect(status).toBe("subscribe");
  unsubscribe();
  expect(status).toBe("unsubscribe");
});

test("family: should ignore onCreate lifecycle if model is family", () => {
  const root = create(
    {
      count: 1,
      onCreate() {
        this.count++;
      },
    },
    { family: true }
  );

  expect(root.count).toBe(1);
});

test("family: key is primitive type", () => {
  const root = create(
    {
      $key: 0,
      count: 1,
      onCreate() {
        this.count += this.$key;
      },
    },
    { family: true }
  );
  const m1 = root.$family(1);
  const m2 = root.$family(2);
  expect(m1.count).toBe(2);
  expect(m2.count).toBe(3);
});

test("family: key is array type", () => {
  const root = create({}, { family: true });
  const m1 = root.$family([1]);
  const m2 = root.$family([1]);
  expect(m1).toBe(m2);
});
