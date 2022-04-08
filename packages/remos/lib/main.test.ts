import { create, inject } from "./main";
import { delay } from "./testUtils";

beforeEach(() => {
  inject([]);
});

test("$extend: with base accessor", () => {
  const baseModel = create({
    count: 1,
    increment(step: number) {
      this.count += step;
    },
  });

  const childModel = baseModel.$extend((base) => ({
    ...base(),
    name: "hung",
    increment() {
      this.count++;
    },
    baseIncrement() {
      base("increment", 1);
      base("increment", 2);
    },
  }));

  expect(childModel.count).toBe(1);
  childModel.increment();
  expect(childModel.count).toBe(2);
  expect(childModel.name).toBe("hung");
  childModel.baseIncrement();
  expect(childModel.count).toBe(5);
});

test("$wait: without selector", async () => {
  let changed = 0;
  const model = create({
    count: 1,
    increment() {
      this.count++;
    },
  });
  model.$wait().then(() => changed++);
  expect(changed).toBe(0);
  model.increment();
  await delay();
  expect(changed).toBe(1);
  model.increment();
  await delay();
  expect(changed).toBe(1);
});

test("$wait: with selector", async () => {
  let changed = 0;
  const model = create({
    count: 1,
    increment() {
      this.count++;
    },
  });
  model.$wait((x) => x.count > 2).then(() => changed++);
  expect(changed).toBe(0);
  model.increment();
  await delay();
  expect(changed).toBe(0);
  model.increment();
  await delay();
  expect(changed).toBe(1);
});

test("$data: should not contain any method or $key", () => {
  const model = create({
    $key: 1,
    count: 1,
    increment() {
      this.count++;
    },
  });
  expect(model.$data()).toEqual({ count: 1 });
});

test("onCreate", () => {
  const model = create({
    count: 1,
    onCreate() {
      this.count++;
    },
  });
  expect(model.count).toBe(2);
});

test("onInit", () => {
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

test("onSubscribe/onUnsubscribe", () => {
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

test("inject", () => {
  inject((model) => model.$wrap((method) => method));
  const root = create({ count: 1 });
  expect(root.count).toBe(1);
});
