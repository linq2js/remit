import * as React from "react";

type Observer = (
  type: "read" | "write" | "call" | "remove",
  value: any
) => void;
type Wrapper = (next: Function, model: Model) => Function;
type Injector = (api: ModelApi, props: any) => void;
type Comparer<T = any> = "strict" | "shallow" | ((a: T, b: T) => boolean);
type ConcurrentMode = (callback: Function) => Function;

type Data<T> = {
  [key in keyof T]: T[key] extends Function ? never : T[key];
};

type Call = <TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult,
  ...args: TArgs
) => TResult;

type Model<TProps extends {} = {}> = {
  [key in keyof TProps]: TProps[key] extends (...args: any[]) => any
    ? TProps[key] extends (
        ...args: infer TArgs
      ) => (model: Model) => infer TResult
      ? (...args: TArgs) => TResult
      : TProps[key]
    : TProps[key];
} & ModelApi<TProps>;

type MemberModel<T extends {} = {}, TKey = any> = Model<T> & {
  $key(): TKey;
  $remove(): void;
};

type FamilyModel<T extends {} = {}, TKey = any> = Model<T> & {
  [familyProp](key: TKey): MemberModel<T, TKey>;
};

interface CacheItem {
  deps: any[] | undefined;
  value: any;
  token: any;
}

interface Sync {
  <TData>(model: AsyncModel<TData>, defaultValue?: TData): TData;
  <TData, TResult>(
    model: AsyncModel<TData>,
    selector: (data: TData) => TResult,
    defaultValue?: TData
  ): TResult;
}

interface AsyncModelLoadContext extends Cancellable {
  singal: AbortController["signal"];
}

interface AsyncModel<TData = any, TError = any> {
  data: TData;
  error: TError;
  loading: boolean;
  /**
   *
   * @param loader
   * @param timeout
   */
  load(
    loader: (cancellable: AsyncModelLoadContext) => Promise<TData>,
    timeout?: number
  ): CancellablePromise<TData>;
  /**
   * lifecycle
   */
  onLoad(): void;
  /**
   * lifecycle
   */
  onSuccess(): void;
  /**
   * lifecycle
   */
  onError(): void;
  /**
   * lifecycle
   */
  onDone(): void;
  /**
   * lifecycle
   */
  cancel(): void;
}
interface Async {
  <TData = any, TError = any>(): AsyncModel<TData, TError>;
  <TData = any, TError = any>(options: { initial: TData }): AsyncModel<
    TData,
    TError
  >;
}

interface Cancellable {
  cancelled(): boolean;
  cancel(): void;
}

interface CancellablePromise<T = any> extends Promise<T>, Cancellable {}

const typeProp = "$$type";
const familyProp = "$family";

interface Base<TProps extends {}> {
  /**
   * get base props
   */
  (): TProps;
  /**
   * call base method
   */
  <
    TMethod extends keyof TProps,
    TArgs extends TProps[TMethod] extends (...args: any[]) => any
      ? Parameters<TProps[TMethod]>
      : never,
    TResult extends TProps[TMethod] extends (...args: any[]) => any
      ? ReturnType<TProps[TMethod]>
      : never
  >(
    name: TMethod,
    ...args: TArgs
  ): TResult;
}

interface Listenable<TProps> {
  /**
   * Register listener to listen model props changed event
   * @param listener
   */
  $listen(listener: VoidFunction): VoidFunction;

  /**
   * Register listener to listen model props changed event.
   * The listener will be called when specified prop is changged
   * @param prop
   * @param listener
   */
  $listen(prop: keyof TProps, listener: VoidFunction): VoidFunction;

  /**
   * Register listener to listen model props changed event.
   * The listener will be called when some of specified props are changged
   * @param props
   * @param listener
   */
  $listen(props: (keyof TProps)[], listener: VoidFunction): VoidFunction;
}

interface WatchOptions<TResult> {
  mode?: ConcurrentMode;
  compare?: Comparer<TResult>;
}

interface Watchable<TProps> {
  $watch<TResult>(
    selector: (model: TProps) => TResult,
    callback: (result: TResult) => void,
    compareFn: Comparer<TResult>
  ): VoidFunction;

  /**
   * The callback will be called when selected value which is returned from the selector is changed.
   * @param selector
   * @param callback
   * @param compareFn
   */
  $watch<TResult>(
    selector: (model: TProps) => TResult,
    callback: (result: TResult) => void,
    options: WatchOptions<TResult>
  ): VoidFunction;
}

interface ModelApi<TProps extends {} = {}>
  extends Listenable<TProps>,
    Watchable<TProps>,
    Slicable<TProps> {
  readonly $model: Model<TProps>;
  readonly $props: TProps;
  /**
   * indicate the model is whether dirty or not
   */
  $dirty(prop?: keyof TProps): boolean;
  $touched(prop?: keyof TProps): boolean;
  $data(): Data<TProps>;

  /**
   * force run init lifecycle. By default, the model runs init lifecycle at first access
   */
  $init(): this;
  /**
   * clone to new model
   */
  $extend(): Model<TProps>;

  /**
   * extend current model using child props builder.
   * The builder retrieves base utils.
   * ```js
   * base(); // return all base model props
   * base('method', arg1, arg2, ...); // call base method with specified args
   * ```
   * @param builder
   */
  $extend<TNewModel extends {}>(
    builder: (base: Base<TProps>) => TNewModel
  ): Model<TNewModel>;

  /**
   * extend current model. This overload is usually for Javascript version
   * or the child model does not contain any prop/method accessing to base model
   * @param props
   */
  $extend<TNewModel extends {}>(props: TNewModel): Model<TNewModel>;

  $extend<
    TResult extends Record<string, any>,
    TNewProps extends Record<string, any>
  >(
    props: TNewProps,
    selector: (props: TProps) => TResult,
    mode?: ConcurrentMode
  ): Model<TResult & TNewProps>;

  /**
   * Reset all props of the model to initial values
   * if hardReset = true, all listeners will be removed
   */
  $reset(hardReset?: boolean): void;

  /**
   * call the method using model as method context
   */
  $call: Call;

  /**
   * wait model's next change
   */
  $wait(): Promise<void>;

  /**
   * wait model's next change
   * @param selector
   * @param compareFn
   */
  $wait<TResult>(
    selector: (model: TProps) => TResult,
    compareFn?: Comparer<TResult>
  ): Promise<TResult>;

  /**
   * listen change from multiple models and call selector to retrieve an update
   * @param model
   * @param selector
   */
  $sync<TModel extends {}>(
    model: TModel,
    selector: TModel extends Model<infer T>
      ? (props: T) => Partial<TProps>
      : (props: {
          [key in keyof TModel]: TModel[key];
        }) => Partial<TProps>,
    mode?: ConcurrentMode
  ): VoidFunction;

  /**
   * Assign specified props to the model.
   * Change event will be triggered once all props are assigned
   * @param props
   * @param lazy
   */
  $merge(props: Partial<TProps>, lazy?: boolean): void;

  $batch(updater: (model: Model<TProps>) => void, lazy?: boolean): void;

  $observe(observer: Observer): this;

  $observe(observers: Observer[]): this;

  $wrap(wrapper: Wrapper): this;

  $wrap(wrappers: Wrapper[]): this;

  $memo<TResult>(key: string, fn: () => TResult, deps?: any[]): TResult;

  $memo<TResult>(fn: () => TResult, deps?: any[]): TResult;

  $silent(): VoidFunction;

  $lock(): VoidFunction;

  toJSON(): TProps;
}

interface Slicable<TProps> {
  $slice<TResult extends Record<string, any>>(
    selector: (props: TProps) => TResult
  ): ModelSlice<TResult>;
}

type ModelSlice<TProps> = Readonly<TProps> &
  Listenable<TProps> &
  Watchable<TProps> &
  Slicable<TProps>;

interface InternalModelApi<TProps extends {} = {}> extends ModelApi<TProps> {
  [typeProp]: any;
  $$initMember(key: any, family: Map<any, Model>): void;
}

interface Create {
  <TProps extends {}>(
    props: TProps,
    key: keyof TProps,
    compareFn?: Comparer<TProps[typeof key]>
  ): FamilyModel<TProps, TProps[typeof key]>;

  <TProps extends {}, TBase extends Record<string, {}>>(
    base: TBase,
    builder: (base: {
      [key in keyof TBase]: TBase[key] extends Model<infer T>
        ? Base<T>
        : Base<TBase[key]>;
    }) => TProps
  ): Model<TProps>;

  <TProps extends {}, TBase extends Record<string, {}>>(
    base: TBase,
    builder: (base: {
      [key in keyof TBase]: TBase[key] extends Model<infer T>
        ? Base<T>
        : Base<TBase[key]>;
    }) => TProps,
    key: keyof TProps,
    compareFn?: Comparer<TProps[typeof key]>
  ): FamilyModel<TProps, TProps[typeof key]>;

  <TProps extends {}>(props: TProps): Model<TProps>;
}

interface UseModel {
  <TProps extends {}>(
    creator: (create: Create) => TProps,
    options?: UseModelOptions<TProps>
  ): Model<TProps>;

  <TProps extends {}>(
    creator: (create: Create) => TProps,
    update?: (prev: TProps) => Partial<TProps>
  ): Model<TProps>;

  <T extends Listenable<TProps>, TProps>(
    listenable: T,
    options?: Omit<UseModelOptions<TProps>, "update">
  ): T;

  (
    listenable: Listenable<any>[],
    options?: Omit<UseModelOptions<any>, "update">
  ): void;

  <T, TResult>(
    listenable: T,
    selector: T extends Listenable<any>
      ? (props: T) => TResult
      : T extends Record<string, any>
      ? (allProps: {
          [key in keyof T]: T[key];
        }) => TResult
      : never,
    compareFn?: Comparer
  ): TResult;

  <TProps extends {}>(props: TProps): Model<TProps>;

  <TProps extends {}>(
    props: TProps,
    update: (prev: TProps) => Partial<TProps>
  ): Model<TProps>;
}

interface Emitter {
  // add handler
  add(handler: Function): VoidFunction;
  // emit event
  emit(event?: any): void;
  // loop through all handlers
  each(callback: (handler: Function) => void): void;
  // clear all handlers
  clear(): void;
}

interface UseModelOptions<TProps extends {} = {}> {
  onChange?: (model: TProps) => void;
  update?: Partial<TProps> | ((prev: TProps) => Partial<TProps>);
}

const effectHook = React.useEffect;
const modelType = {};
const enqueue = Promise.resolve().then.bind(Promise.resolve());
let globalInjectors: Injector[] | undefined;

function strictCompare(a: any, b: any) {
  return a === b;
}

function shallowCompare(a: any, b: any) {
  if (a === b) return true;
  // handle falsy
  if ((a && !b) || (b && !a)) return false;
  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray && bIsArray) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  if ((aIsArray && !bIsArray) || (bIsArray && !aIsArray)) {
    return false;
  }
  const aIsDate = a instanceof Date;
  const bIsDate = b instanceof Date;
  if (aIsDate && bIsDate) {
    return a.getTime() === b.getTime();
  }
  if ((aIsDate && !bIsDate) || (bIsDate && !aIsDate)) {
    return false;
  }
  if (typeof a === "object" && typeof b === "object") {
    for (const key in a) {
      if (a[key] !== b[key]) return false;
    }
    for (const key in b) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  }
  return false;
}

function getCompareFunction<T = any>(
  compareFn?: Comparer<T>,
  defaultCompareFn = strictCompare
) {
  if (typeof compareFn === "function") return compareFn;
  if (compareFn === "shallow") return shallowCompare;
  return defaultCompareFn;
}

function keyCompare(a: any, b: any) {
  return shallowCompare(a, b);
}

/**
 * check the value is whether model or not
 * @param value
 * @returns
 */
function isModel(value: any): value is Model {
  return value?.[typeProp]?.() === modelType;
}

function createEmitter(): Emitter {
  const handlers: Function[] = [];
  return {
    each(callback) {
      handlers.forEach(callback);
    },
    add(handler) {
      handlers.push(handler);
      let active = true;
      return () => {
        if (!active) return;
        const index = handlers.indexOf(handler);
        if (index !== -1) handlers.splice(index, 1);
      };
    },
    emit(payload) {
      for (const handler of handlers.slice(0)) {
        handler(payload);
      }
    },
    clear() {
      handlers.length = 0;
    },
  };
}

function createWatchable<
  TProps,
  TContext extends TProps & Listenable<TContext> = any
>(getContext: () => TContext): Watchable<TProps> {
  return {
    $watch(selector, callback, options) {
      if (typeof options === "function" || typeof options === "string") {
        options = { compare: options };
      }

      const context = getContext();
      let prev = selector(context);
      const cf = getCompareFunction(options?.compare);
      const wrappedCallback = options.mode ? options.mode(callback) : callback;
      return context.$listen(() => {
        const next = selector(context);
        if (!cf(prev, next)) {
          prev = next;
          wrappedCallback(next);
        }
      });
    },
  };
}

function createListenable<TContext = any>(
  getContext: () => TContext,
  emitter: Emitter,
  init?: VoidFunction
): Listenable<TContext> {
  return {
    $listen(...args: any[]) {
      let listener: Function;
      const context: any = getContext();

      init?.();

      if (typeof args[0] !== "function") {
        if (Array.isArray(args[0])) {
          const prev: Record<string, any> = {};
          const props = args[0];
          const originListener = args[1];

          const updatePrevValues = () =>
            props.forEach((prop) => (prev[prop] = context[prop]));

          updatePrevValues();

          listener = () => {
            if (props.some((prop) => prev[prop] !== context[prop])) {
              updatePrevValues();
              originListener();
            }
          };
        } else {
          const prop = args[0];
          const originListener = args[1];
          let prev = context[prop];
          listener = () => {
            if (context[prop] === prev) return;
            prev = context[prop];
            originListener();
          };
        }
      } else {
        listener = args[0];
      }

      return emitter.add(listener);
    },
  };
}

function createSlicable<TProps>(
  getContext: () => TProps & Watchable<TProps>
): Slicable<TProps> {
  return {
    $slice(selector) {
      return createSlice(getContext, selector);
    },
  };
}

function createSlice<TProps, TResult>(
  getContext: () => TProps & Watchable<TProps>,
  selector: (props: TProps) => TResult
): ModelSlice<TResult> {
  const emitter = createEmitter();
  let slice: TProps & Listenable<TProps> & Watchable<TProps>;
  const sliceGetter = () => slice;
  const context = getContext();
  slice = {
    ...selector(context),
    ...(undefined as unknown as TProps),
    ...createListenable(sliceGetter, emitter),
    ...createWatchable(sliceGetter),
    ...createSlicable(sliceGetter),
  };
  context.$watch(
    ((result: any) => selector(result)) as any,
    (result) => {
      Object.assign(slice, result);
      emitter.emit();
    },
    "shallow"
  );
  return slice as any;
}

/**
 * create a model with specified props
 * @param props
 * @returns
 */
const create: Create = (...args: any[]): any => {
  let model: Model<any>;
  let familyKeyProp: string | undefined;
  let familyKeyCompare: Comparer | undefined;
  let props: any;

  if (isModel(args[0])) return args[0];
  // builder
  if (typeof args[1] === "function") {
    const bases: Record<string, Function> = {};
    const builder = args[1] as Function;
    Object.entries(args[0] as Record<string, Model<any>>).forEach(
      ([key, base]) => {
        const props: any = isModel(base) ? base.$props : base;

        bases[key] = (name: string, ...args: any[]) => {
          // get base props
          if (!name) {
            return props;
          }

          if (!model) {
            throw new Error("Cannot call base method inside props builder");
          }

          const method = props[name];
          if (typeof method !== "function") {
            throw new Error(`Invalid base method ${name}`);
          }

          return model.$call(method, ...args);
        };
      }
    );
    props = builder(bases);
    familyKeyProp = args[2];
    familyKeyCompare = args[3];
  } else {
    props = args[0];
    familyKeyProp = args[1];
    familyKeyCompare = args[2];
  }

  if (!props) throw new Error("Invalid model props");

  let updatingJobs = 0;
  const initialToken = {};
  let changeToken = initialToken;

  let initialized = false;
  let api: InternalModelApi;
  let isCreating = true;
  let invokingMethodName: string | undefined;
  let slientRequests = 0;
  let lockers = 0;
  let touched = new Set<string>();
  const emitter = createEmitter();
  const cache = new Map<string, CacheItem>();
  const family = new Map<any, Model>();
  const observers: Observer[] = [];
  const wrappers: Wrapper[] = [];
  const notifyChange = () => {
    model.onChange?.();
    emitter.emit();
  };

  // clone prop
  const data: any = {};

  function emit(...args: Parameters<Observer>) {
    const [type, value] = args;
    observers.forEach((o) => o(type, value));
  }

  function assign(props: any, target: any = model) {
    if (props === model || lockers) return;

    Object.keys(props).forEach((key) => {
      const value = props[key];
      if (
        // internal methods / props
        key[0] === "$" ||
        typeof value === "function" ||
        // not exist key
        !(key in target)
      ) {
        return;
      }
      if (isModel(target[key])) {
        target[key].$merge(value);
      } else {
        target[key] = value;
      }
    });
  }

  function call(method: Function, args: any[] = [], lazy: boolean = false) {
    updatingJobs++;
    const token = changeToken;
    try {
      const result = method.apply(model, args);
      if (typeof result === "function") {
        return result(model);
      }
      return result;
    } finally {
      updatingJobs--;
      if (!updatingJobs && token !== changeToken) {
        if (lazy) {
          const lazyToken = changeToken;
          enqueue(() => {
            if (lazyToken !== changeToken) return;
            notifyChange();
          });
        } else {
          notifyChange();
        }
      }
    }
  }

  function init() {
    if (initialized || isCreating) return;
    initialized = true;
    model.onInit?.();
  }

  const modelGetter = () => model;

  api = {
    [typeProp]: () => modelType,

    ...createListenable(modelGetter, emitter, init),
    ...createWatchable(modelGetter),
    ...createSlicable(modelGetter),
    $props: props,
    $dirty(prop: any) {
      if (!prop) {
        return changeToken !== initialToken;
      }
      return props[prop] !== data[prop];
    },
    $touched(prop) {
      if (!prop) return !!touched.size;
      return touched.has(prop as any);
    },
    $data: () => data,
    $$initMember(key: any, family: Map<any, Model>) {
      let removed = false;
      Object.assign(model as MemberModel, {
        $all: () =>
          Array.from(family.values()).map((x) => ({
            key: (x as MemberModel).$key(),
            data: x.$data(),
          })),
        $key: () => key,
        $remove: () => {
          if (removed) return;
          removed = true;
          family.delete(key);
          emit("remove", undefined);
        },
      });
    },
    get $model(): any {
      if (isCreating && model) {
        throw new Error(
          "Model is not ready. It seems you are trying to access the $model inside injector"
        );
      }
      return model;
    },

    $init(): any {
      init();
      return model;
    },

    toJSON: () => data,

    $silent() {
      let active = true;
      const token = changeToken;
      slientRequests++;
      return () => {
        if (!active) return;
        slientRequests--;
        if (!slientRequests) {
          if (token !== changeToken) {
            notifyChange();
          }
        }
      };
    },
    $lock() {
      let active = true;
      lockers++;
      return () => {
        if (!active) return;
        lockers--;
      };
    },
    $sync(models, selector, mode) {
      if (isModel(models)) {
        const model = models as unknown as Model;
        return model.$listen(() => {
          const update = selector(model as any);
          assign(update);
        });
      }
      const entries: any[] = Object.entries(models);
      const handleChange = () => {
        const update = selector(models);
        assign(update);
      };

      const wrappedHandler = mode ? mode(handleChange) : handleChange;

      const unsubscribes: VoidFunction[] = entries.map(([, model]) =>
        model.$listen(wrappedHandler)
      );

      // sync immediately
      handleChange();
      return () => {
        while (unsubscribes.length) {
          unsubscribes.pop()?.();
        }
      };
    },
    $call(fn, ...args) {
      return call(fn, args);
    },
    $observe(input) {
      observers.push(...(Array.isArray(input) ? input : [input]));
      return this;
    },
    $wrap(input) {
      if (!isCreating) {
        throw new Error("This api must be called inside injector function");
      }
      wrappers.push(...(Array.isArray(input) ? input : [input]));
      return this;
    },
    $extend(...args: any[]): any {
      if (!args.length) {
        return create(props);
      }

      // extend with sync
      if (typeof args[1] === "function") {
        const selector = args[1];
        const mode: ConcurrentMode = args[2];
        const props = args[0];
        const child = create({ ...selector(model), ...props });
        child.$sync(model, selector as any, mode);
        return child;
      }

      // props builder
      if (typeof args[0] === "function") {
        const builder: Function = args[0];
        return create({ base: model }, (bases) => builder(bases.base));
      }

      const newProps = args[0];
      return create({ ...props, ...newProps });
    },
    $batch(updater, lazy) {
      init();
      call(updater, [model], !!lazy);
    },
    $wait(selector?: Function, compareFn = strictCompare): any {
      let cancel: Function | undefined;
      let prev: any = selector?.(model);

      const promise = new Promise((resolve) => {
        cancel = api.$listen(() => {
          if (selector) {
            const next = selector?.(model);
            if (!compareFn(prev, next)) {
              prev = next;
              cancel?.();
              resolve(next);
            }
          } else {
            cancel?.();
            resolve(model);
          }
        });
      });
      return Object.assign(promise, { cancel: () => cancel?.() });
    },
    $reset(hardReset) {
      call(() => {
        changeToken = initialToken;
        cache.clear();
        touched.clear();
        if (hardReset) {
          family.clear();
          emitter.clear();
        }
        assign(props, data);
        initialized = false;
        notifyChange();
      });
    },
    $merge(props: any, lazy?: boolean) {
      call(assign, [props], !!lazy);
    },
    $memo(...args: any[]) {
      let key = invokingMethodName;
      if (!key) {
        throw new Error("$memo can be called inside model method");
      }
      let fn: Function;
      let deps: any[] | undefined;
      if (typeof args[0] === "function") {
        fn = args[0];
        deps = args[1];
      } else {
        key += ":" + args[0];
        fn = args[1];
        deps = args[2];
      }
      let memo = cache.get(key);

      // changed or not initialized
      if (
        !memo ||
        !shallowCompare(memo.deps, deps) ||
        // no dep and token is expired
        (!deps && memo.token !== changeToken)
      ) {
        memo = { deps, value: fn(...(deps ?? [])), token: changeToken };
        cache.set(key, memo);
      }
      return memo.value;
    },
  };

  if (familyKeyProp) {
    const compareFn = getCompareFunction(familyKeyCompare, keyCompare);
    const findMember = (key: any): [any, Model | undefined] => {
      if (key && (Array.isArray(key) || typeof key === "object")) {
        const keyIterator = family.entries();
        while (true) {
          const { value, done } = keyIterator.next();
          if (done) break;
          if (compareFn(value[0], key)) {
            return value;
          }
        }
        return [, undefined];
      } else {
        return [key, family.get(key)];
      }
    };

    Object.assign(api, {
      [familyProp]: (key: any) => {
        let [mapKey = key, member] = findMember(key);
        if (!member) {
          member = create({ ...props, [familyKeyProp as string]: key });
          (member as InternalModelApi).$$initMember(mapKey, family);
          family.set(mapKey, member);
        }
        return member;
      },
    });
  }

  model = { ...api };

  const initialProps: any = { ...props };
  // injector must run before property bindings
  globalInjectors?.forEach((injector) => injector(api, initialProps));

  Object.keys(initialProps).forEach((key) => {
    const value = initialProps[key];

    // skip special props
    if (key[0] === "$") {
      return;
    }

    // method
    if (typeof value === "function") {
      let method = value;

      wrappers.forEach((wrapper) => {
        method = wrapper(method, model);
      });

      model[key] = (...args: any[]) => {
        emit("call", method);
        const prevInvokingMethodName = invokingMethodName;
        invokingMethodName = key;
        try {
          return call(method, args);
        } finally {
          invokingMethodName = prevInvokingMethodName;
        }
      };
      return;
    }

    // private prop
    if (
      key[0] === "_" ||
      key[0] === "#" ||
      key[0] === "@" ||
      key[0] === "!" ||
      key[0] === "~" ||
      key[0] === "&" ||
      key[0] === "*" ||
      key[0] === "%"
    ) {
      model[key] = value;
      return;
    }

    if (isModel(value)) {
      Object.defineProperty(model, key, {
        enumerable: true,
        get: () => {
          init();
          return data[key];
        },
      });
    } else {
      // public prop
      Object.defineProperty(model, key, {
        enumerable: true,
        get: () => {
          init();
          emit("read", key);
          return data[key];
        },
        set: (value: any) => {
          if (lockers) return;
          init();
          emit("write", key);
          if (value === data[key]) return;
          data[key] = value;
          touched.add(key);
          changeToken = {};
          // trigger individual prop change event
          model["on" + key[0].toUpperCase() + key.slice(1) + "Change"]?.();
          if (updatingJobs) return;
          notifyChange();
        },
      });
    }

    data[key] = value;
  });

  isCreating = false;

  return model;
};

class AbstractMethodError extends Error {
  constructor(name?: string) {
    super(
      `${
        name ? "The method " + name : "This method"
      } is abstract and it has not been implemented yet`
    );
  }
}

const abstract = <TArgs extends any[] = any[], TResult = void>(
  name?: string
): ((...args: TArgs) => TResult) => {
  return (() => {
    throw new AbstractMethodError(name);
  }) as any;
};

const useModel: UseModel = (...args: any[]): any => {
  const modelRef = React.useRef<Model>();
  const rerender = React.useState<any>()[1];
  const optionsRef = React.useRef<UseModelOptions>({});
  const selectorRef = React.useRef<Function>();
  const compareFnRef = React.useRef<Comparer>();
  const errorRef = React.useRef<any>();
  const models: Model[] = [];
  const renderingRef = React.useRef(true);
  let creator: Function | undefined;
  let inputOptions: UseModelOptions | undefined;
  renderingRef.current = true;

  // useModel(creator)
  if (typeof args[0] === "function") {
    creator = args[0];
    if (!modelRef.current) {
      modelRef.current = create(creator?.(create));
    }
    inputOptions = args[1];
    models.push(modelRef.current!);
  } else {
    // useModel(models, options)
    if (Array.isArray(args[0])) {
      args[0]
        .filter((x) => !!x)
        .forEach((model) => {
          if (models.includes(model)) return;
          models.push(model);
        });
      inputOptions = args[1];
    } else if (args[0]) {
      // useModel(model, selector, compareFn)
      if (isModel(args[0])) {
        const model: Model = (modelRef.current = args[0]);

        // useModel(model, selector, compareFn)
        if (typeof args[1] === "function") {
          const selector: Function = args[1];
          selectorRef.current = () => selector(model);
          compareFnRef.current = args[2];
        } else {
          // useModel(model, options)
          inputOptions = args[1];
        }
        models.push(args[0]);
      } else {
        // useModel(models, selector, compareFn)
        if (typeof args[1] === "function") {
          const modelMap: Record<string, Model> = args[0];
          const selector: Function = args[1];
          selectorRef.current = () => {
            return selector(modelMap);
          };
          compareFnRef.current = args[2];
          models.push(...Object.values(modelMap));
        } else {
          // useModel(props, options)
          // useModel(props, update, options)
          const props = args[0];
          if (!modelRef.current) {
            modelRef.current = create(props);
          }
          models.push(modelRef.current);
          if (typeof args[1] === "function") {
            inputOptions = { update: args[1], ...args[2] };
          } else {
            inputOptions = args[1];
          }
        }
      }
    }

    if (!models.length) {
      throw new Error("No model spcified");
    }
  }

  optionsRef.current =
    (typeof inputOptions === "function"
      ? { update: inputOptions }
      : inputOptions) ?? {};

  effectHook(() => {
    let prevValue: any;
    const handleChange = (model: Model) => {
      errorRef.current = undefined;

      try {
        if (renderingRef.current) return;
        optionsRef.current.onChange?.(model);

        // has selector
        if (selectorRef.current) {
          const nextValue = selectorRef.current(...models);
          const compareFn = getCompareFunction(compareFnRef.current);
          // nothing change
          if (compareFn(prevValue, nextValue)) return;
          prevValue = nextValue;
        }
      } catch (e) {
        errorRef.current = e;
      }

      rerender({});
    };
    const unsubscribes = models.map((model) =>
      model.$listen(() => handleChange(model))
    );
    return () => {
      unsubscribes.forEach((x) => x());
    };
  }, models);

  if (optionsRef.current.update) {
    modelRef.current?.$merge(
      typeof optionsRef.current.update === "function"
        ? optionsRef.current.update(modelRef.current)
        : optionsRef.current.update
    );
  }

  renderingRef.current = false;

  if (errorRef.current) {
    const error = errorRef.current;
    errorRef.current = undefined;
    throw error;
  }

  if (selectorRef.current) {
    return selectorRef.current(...models);
  }

  return models[0];
};

function as<T>(value: T) {
  return value;
}

function of<TProps>(props: TProps): Model<TProps> {
  return props as any as Model<TProps>;
}

/**
 * register injectors that will inject to the model at the creating phase
 * @param injectors
 * @returns previously registered injectors
 */
function inject(injectors: Injector | Injector[]) {
  const prevInjectors = globalInjectors ?? [];
  globalInjectors = Array.isArray(injectors) ? injectors : [injectors];
  return prevInjectors;
}

function sequential(afterDone: boolean = false): ConcurrentMode {
  let lastPromise: Promise<any> | undefined;
  const resolved = Promise.resolve();

  return (f) =>
    (...args: any[]) => {
      if (lastPromise) {
        if (afterDone) {
          return (lastPromise = lastPromise.finally(() => f(...args)));
        }
        return (lastPromise = lastPromise.then(() => f(...args)));
      }
      const result = f(...args);
      if (typeof result?.then === "function") {
        return (lastPromise = result);
      }
      return resolved;
    };
}

function droppable(): ConcurrentMode {
  let calling = false;
  return (f) =>
    (...args: any[]) => {
      if (calling) return;
      calling = true;
      let isAsync = false;
      try {
        const result = f(...args);
        if (typeof result?.then === "function") {
          isAsync = true;
          return result.finally(() => {
            calling = false;
          });
        }
      } finally {
        if (!isAsync) {
          calling = false;
        }
      }
    };
}

function debounce(ms: number = 0): ConcurrentMode {
  let timer: any;
  return (f) =>
    (...args: any[]) => {
      clearTimeout(timer);
      return new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          try {
            resolve(f(...args));
          } catch (e) {
            reject(e);
          }
        }, ms);
      });
    };
}

function once(): ConcurrentMode {
  let called = false;
  let lastResult: any;
  return (f) =>
    (...args: any[]) => {
      if (called) return lastResult;
      called = true;
      return (lastResult = f(...args));
    };
}

function throttle(ms: number): ConcurrentMode {
  let lastTime: number;
  let lastResult: any;
  return (f) =>
    (...args: any[]) => {
      const now = Date.now();
      if (!lastTime || lastTime + ms < now) {
        lastTime = now;
        lastResult = f(...args);
      }
      return lastResult;
    };
}

function createCancellable(onCancel?: VoidFunction) {
  let cancelled = false;
  const cancellable: Cancellable = {
    cancelled() {
      return cancelled;
    },
    cancel() {
      if (cancelled) return;
      cancelled = true;
      onCancel?.();
    },
  };
  return cancellable;
}

const sync: Sync = (model: AsyncModel, ...args: any[]) => {
  let selector: Function | undefined;
  let defaultValue: any;
  let hasDefaultValue = false;
  if (typeof args[0] === "function") {
    [selector, defaultValue] = args;
    hasDefaultValue = args.length > 1;
  } else {
    defaultValue = args[0];
    hasDefaultValue = !!args.length;
  }
  if (model.error) {
    if (hasDefaultValue) return defaultValue;
    throw model.error;
  }
  if (model.loading) {
    if (hasDefaultValue) return defaultValue;
    throw (model as any)._promise;
  }
  if (selector) {
    return selector(model.data);
  }
  return model.data;
};

const async: Async = (options?: any): AsyncModel => {
  return {
    data: options?.initial,
    loading: false,
    error: undefined,
    onLoad() {},
    onSuccess() {},
    onError() {},
    onDone() {},
    cancel() {
      if (!this.loading) return;
      (this as any)._token = {};
      (this as any)._promise?.cancel?.();
      (this as any)._promise = undefined;
      this.loading = false;
    },
    load(fn: Function, timeout) {
      this.loading = true;
      this.error = undefined;

      let timer: any;
      const token = ((this as any)._token = {});
      const model = of(this);
      const abortController = new AbortController();
      const cancellable = createCancellable(() => {
        clearTimeout(timer);
        abortController.abort();
      });

      model.onLoad();

      const promise: CancellablePromise = Object.assign(
        new Promise((resolve, reject) => {
          fn(
            Object.assign(cancellable, { signal: abortController.signal })
          ).then(
            (data: any) => {
              if (token !== (this as any)._token) return;
              model.$merge({ loading: false, data });
              model.onSuccess();
              model.onDone();
              resolve(data);
            },
            (error: any) => {
              if (token !== (this as any)._token) return;
              model.$merge({ loading: false, error });
              model.onError();
              model.onDone();
              reject(error);
            }
          );
        }),
        cancellable
      );

      // handle rejection
      promise.catch(() => {});

      if (timer) {
        timer = setTimeout(cancellable.cancel, timeout);
      }

      return ((this as any)._promise = promise);
    },
  };
};

export {
  Model,
  ModelApi,
  UseModel,
  Wrapper,
  ModelSlice,
  FamilyModel,
  MemberModel,
  Create,
  UseModelOptions,
  Injector,
  Comparer,
  Observer,
  ConcurrentMode,
  Async,
  Sync,
  AsyncModel,
  Emitter,
  CancellablePromise,
  as,
  of,
  isModel,
  useModel,
  async,
  sync,
  create,
  inject,
  shallowCompare,
  strictCompare,
  createEmitter,
  createCancellable,
  debounce,
  throttle,
  once,
  droppable,
  sequential,
  abstract,
};
