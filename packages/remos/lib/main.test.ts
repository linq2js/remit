import { abstract, async, create, inject, Model, of, sync } from "./main";
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
    _onInit() {
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

test("_onInit", () => {
  let initialized = false;
  const model = create({
    count: 1,
    _onInit() {
      initialized = true;
    },
  });
  expect(initialized).toBe(false);
  // first access
  model.count;
  expect(initialized).toBe(true);
});

test("family: key is primitive type", () => {
  const root = create(
    {
      key: 0,
      count: 1,
      other: "",
      _onInit() {
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
    _onInit() {
      this.load(() => delay(10).then(() => 1));
    },
  });
  expect(model.loading).toBeTruthy();
  await delay(15);
  expect(model.data).toBe(1);
  expect(model.loading).toBeFalsy();
});

test("asyncModel: loader", async () => {
  const model = create({
    ...async((_, value: number) => delay(10).then(() => value), 1),
  });
  expect(model.loading).toBeTruthy();
  await delay(15);
  expect(model.data).toBe(1);
  expect(model.loading).toBeFalsy();
  model.params = [2];
  expect(model.loading).toBeTruthy();
  await delay(15);
  expect(model.data).toBe(2);
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
    _onInit() {
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
    _onInit() {
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
    _onInit() {
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
    _onAChange() {
      logs.push("a");
    },
    _onBChange() {
      logs.push("b");
    },
  });
  expect(logs).toEqual([]);
  model.a++;
  expect(logs).toEqual(["a"]);
  model.b++;
  expect(logs).toEqual(["a", "b"]);
});

test("oop: polymorphism", () => {
  const student = {
    study() {},
  };
  const writter = {
    write() {},
  };
  const player = {
    play() {},
  };
  const bill = create({
    ...student,
    ...writter,
    ...player,
  });

  expect(bill.play).toBeInstanceOf(Function);
  expect(bill.study).toBeInstanceOf(Function);
  expect(bill.write).toBeInstanceOf(Function);
});

test("oop: abstraction", () => {
  const computerPrint = jest.fn();
  const casioPrint = jest.fn();
  const calculator = {
    a: 0,
    b: 0,
    print: abstract<[number]>(),
    sum() {
      const result = this.a + this.b;
      this.print(result);
    },
  };

  const computer = create({
    ...calculator,
    print: computerPrint,
  });

  const casio = create({
    ...calculator,
    print: casioPrint,
  });

  computer.a = 1;
  computer.b = 2;
  computer.sum();
  expect(computerPrint).toBeCalledWith(3);

  casio.a = 2;
  casio.b = 2;
  casio.sum();
  expect(casioPrint).toBeCalledWith(4);
});

test("lifecycle", () => {
  const logs = new Array<string>();
  const model = create({
    count: 1,
    double: 0,
    _onInit() {
      logs.push("init");
    },
    _onCountChange() {
      logs.push("countChange");
    },
    _validateCount() {
      logs.push("validateCount");
    },
    _onChange() {
      logs.push("change");
    },
    _validateAll() {
      logs.push("validateAll");
    },
    _getDouble() {
      return this.count * 2;
    },
  });

  model.count;
  expect(logs).toEqual(["init"]);
  expect(model.double).toBe(2);
  model.count++;
  expect(model.double).toBe(4);
  expect(logs).toEqual([
    "init",
    "countChange",
    "validateCount",
    "change",
    "validateAll",
  ]);
});

test("$invalid", () => {
  const model = create({
    value: 0,
    _validateValue() {
      if (this.value < -10) throw new Error();
      of(this).$invalid("value", this.value < 0);
    },
  });

  expect(model.$invalid("value")).toBeUndefined();
  model.value = -1;
  expect(model.$invalid("value")).toBeTruthy();
  model.value = 0;
  expect(model.$invalid("value")).toBeUndefined();
  model.value = -11;
  expect(model.$invalid("value")).toBeInstanceOf(Error);
});

test("custom getter", () => {
  const model = create({
    a: 1,
    b: 2,
    sum: 0,
    temp: 0,
    _getSum() {
      return this.a + this.b;
    },
    _getTemp() {
      return 1;
    },
    _setTemp() {
      throw new Error("temp");
    },
  });

  expect(model.sum).toBe(3);
  model.a++;
  expect(model.sum).toBe(4);
  expect(() => (model.sum = 1)).toThrowError("The prop sum is readonly");
  expect(model.temp).toBe(1);
  expect(() => (model.temp = 2)).toThrowError("temp");
});

test("$when", async () => {
  const logs: string[] = [];
  const model = create({
    count: 0,
    increase() {
      this.count++;
    },
  });
  model.$when("count").then(() => logs.push("count"));
  model.$when("increase").then(() => logs.push("increase"));
  expect(logs).toEqual([]);
  model.increase();
  await delay();
  expect(logs).toEqual(["increase", "count"]);
});
