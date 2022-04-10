import { async, create, inject, Model, of, sync } from "./main";
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

test("multiple inheritance", () => {
  const actions: string[] = [];
  const scanner = {
    scan() {
      actions.push("scanner.scan");
    },
    start() {
      actions.push("scanner.start");
      this.scan();
    },
  };
  const printer = {
    print() {
      actions.push("printer.print");
    },
    start() {
      actions.push("printer.start");
      this.print();
    },
  };
  const copier = create({ scanner, printer }, ({ scanner, printer }) => ({
    ...scanner(),
    ...printer(),
    start() {
      actions.push("copier.start");
      scanner("start");
      printer("start");
    },
  }));

  copier.start();

  expect(actions).toEqual([
    "copier.start",
    "scanner.start",
    "scanner.scan",
    "printer.start",
    "printer.print",
  ]);
});

test("$sync", () => {
  const a = create({ value: 1 });
  const b = create({ value: 2 });
  const sum = create({
    result: 0,
    onInit() {
      of(this).$sync({ a, b }, ({ a, b }) => ({ result: a.value + b.value }));
    },
  });

  expect(sum.result).toBe(3);
  a.value++;
  expect(sum.result).toBe(4);
  b.value++;
  expect(sum.result).toBe(5);
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

test("$data: should not contain any method or sepcial props (start with $)", () => {
  const model = create({
    $p: 1,
    count: 1,
    increment() {
      this.count++;
    },
  });
  expect(model.$data()).toEqual({ count: 1 });
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

test("family: should ignore onCreate lifecycle if model is family", () => {
  const root = create(
    {
      key: 0,
      count: 1,
      onCreate() {
        this.count++;
      },
    },
    "key"
  );

  expect(root.count).toBe(1);
});

test("family: key is primitive type", () => {
  const root = create(
    {
      key: 0,
      count: 1,
      other: "",
      onInit() {
        this.count += this.key;
      },
    },
    "key"
  );

  const m1 = root.$family(1);
  const m2 = root.$family(2);
  expect(m1.count).toBe(2);
  expect(m2.count).toBe(3);
});

test("family: key is array type", () => {
  const root = create({ key: [] as number[] }, "key");
  const m1 = root.$family([1]);
  const m2 = root.$family([1]);
  expect(m1.key).toBe(m2.key);
  expect(m1).toBe(m2);
});

test("inject", () => {
  inject((model) => model.$wrap((method) => method));
  const root = create({ count: 1 });
  expect(root.count).toBe(1);
});

test("stringify", () => {
  const model = create({ count: 1 });
  expect(JSON.stringify(model)).toBe(JSON.stringify(model.$props));
});

test("memo", () => {
  let ab = 0;
  let bc = 0;
  let ac = 0;
  const model = create({
    a: 1,
    b: 2,
    c: 3,
    d: 4,
    ab() {
      return (this as {} as Model).$memo(() => {
        ab++;
        return this.a + this.b;
      }, [this.a, this.b]);
    },
    bc() {
      return (this as {} as Model).$memo(() => {
        bc++;
        return this.b + this.c;
      }, [this.b, this.c]);
    },
    ac() {
      return (this as {} as Model).$memo(() => {
        ac++;
        return this.a + this.c;
      });
    },
  });

  // ab is evaluated first time
  expect(model.ab()).toBe(3);
  expect(model.ab()).toBe(3);
  expect(model.ab()).toBe(3);
  expect(ab).toBe(1);

  // bc is evaluated first time
  expect(model.bc()).toBe(5);
  expect(bc).toBe(1);
  // ac is evaluated first time
  expect(model.ac()).toBe(4);
  expect(model.ac()).toBe(4);
  expect(model.ac()).toBe(4);
  expect(ac).toBe(1);

  // d is changed
  model.d++;
  // ab, bc, ac are not changed
  expect(model.ab()).toBe(3);
  expect(model.bc()).toBe(5);
  expect(model.ac()).toBe(4);
  // ab and bc does not re-evaluate
  expect(ab).toBe(1);
  expect(bc).toBe(1);
  // ac re-evaluates
  expect(ac).toBe(2);

  model.c++;
  // bc re-evaliuates
  expect(model.bc()).toBe(6);
  expect(bc).toBe(2);

  // ac re-evaliuates
  expect(model.ac()).toBe(5);
  expect(ac).toBe(3);
});

test("asyncModel", async () => {
  const model = create({
    ...async(),
    onInit() {
      this.load(() => delay(10).then(() => 1));
    },
  });
  expect(model.loading).toBeTruthy();
  await delay(15);
  expect(model.data).toBe(1);
  expect(model.loading).toBeFalsy();
});

test("$slice", () => {
  const logs: string[] = [];
  const root = create({
    other: 1,
    level1: {
      level2: {
        level3: {
          value: 1,
        },
      },
    },
  });

  const slice1 = root.$slice((x) => ({ data: x.level1 }));
  const slice2 = slice1.$slice((x) => ({ data: x.data.level2 }));
  const slice3 = slice2.$slice((x) => ({ data: x.data.level3 }));
  slice1.$listen(() => logs.push("slice1"));
  slice2.$listen(() => logs.push("slice2"));
  slice3.$listen(() => logs.push("slice3"));
  expect(slice3.data.value).toBe(1);
  root.level1 = {
    ...root.level1,
    level2: {
      ...root.level1.level2,
      level3: {
        ...root.level1.level2.level3,
        value: 2,
      },
    },
  };
  expect(slice3.data.value).toBe(2);
  expect(logs).toEqual(["slice3", "slice2", "slice1"]);
  root.other++;
  expect(logs).toEqual(["slice3", "slice2", "slice1"]);
});

test("sync: with default value (success)", async () => {
  const model = create({
    ...async<number>(),
    onInit() {
      this.load(() => delay(10).then(() => 1));
    },
  });
  expect(model.loading).toBeTruthy();
  expect(sync(model, 0)).toBe(0);
  await delay(15);
  expect(sync(model, 0)).toBe(1);
});

test("sync: with default value (error)", async () => {
  const model = create({
    ...async<number>(),
    onInit() {
      this.load(() =>
        delay(10).then(() => {
          throw new Error();
        })
      );
    },
  });
  expect(model.loading).toBeTruthy();
  expect(sync(model, 0)).toBe(0);
  await delay(15);
  expect(sync(model, 0)).toBe(0);
});

test("sync: (error)", async () => {
  const model = create({
    ...async<number>(),
    onInit() {
      this.load(() =>
        delay(10).then(() => {
          throw new Error("invalid");
        })
      );
    },
  });
  expect(model.loading).toBeTruthy();
  try {
    sync(model);
    // it should not reach here
    throw new Error();
  } catch (e) {
    expect(e).toBeInstanceOf(Promise);
  }
  await delay(15);
  expect(() => sync(model)).toThrow("invalid");
});

test("individual prop change event", () => {
  const logs: string[] = [];
  const model = create({
    a: 1,
    b: 2,
    onAChange() {
      logs.push("a");
    },
    onBChange() {
      logs.push("b");
    },
  });
  expect(logs).toEqual([]);
  model.a++;
  expect(logs).toEqual(["a"]);
  model.b++;
  expect(logs).toEqual(["a", "b"]);
});
