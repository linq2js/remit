import * as React from "react";

interface MethodCallArgs {
  type: "call";
  method: string;
  args: any[];
}

interface MemberRemoveArgs {
  type: "remove";
  key: any;
  model: MemberModel;
}

interface ReadDataArgs {
  type: "read";
  key: string;
}

interface WriteDataArgs {
  type: "write";
  key: string;
  value: any;
}

interface Accessor<TValue = any, TProps = any> extends Listenable {
  model: Model<TProps>;
  value: TValue;
  invalid: any;
  get<TState>(type: State<TState>): TState | undefined;
  set<TState>(type: State<TState>, value: TState): void;
}

type PropMeta = ConcurrentMode | { mode?: ConcurrentMode };

type ObserverArgs =
  | MethodCallArgs
  | MemberRemoveArgs
  | ReadDataArgs
  | WriteDataArgs;

type ActivityFilter<TProp = {}> =
  | keyof TProp
  | Omit<MethodCallArgs, "args">
  | Omit<MemberRemoveArgs, "model">
  | ReadDataArgs
  | Omit<WriteDataArgs, "value">;

type Observer = (args: ObserverArgs) => void;
type Wrapper = (next: Function, model: Model) => Function;
type Injector = (api: ModelApi, props: any) => any;
type Comparer<T = any> = "strict" | "shallow" | ((a: T, b: T) => boolean);
type ConcurrentMode = (callback: Function, onCancel?: VoidFunction) => Function;

type Data<T> = {
  [key in keyof T]: T[key] extends Function ? never : T[key];
};

type Call = <TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult,
  ...args: TArgs
) => TResult;

type AnyProps = Record<string, any>;

type Model<TProps extends {} = AnyProps> = {
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

type FamilyModel<TProps extends {} = {}, TKey = any> = Model<TProps> & {
  [familyProp](key: TKey): MemberModel<TProps, TKey>;
  $data(): [any, any][];
  $hydrate(data: [any, TProps][]): void;
};

interface CacheItem {
  deps: any[] | undefined;
  value: any;
  token: any;
}

interface Sync {
  <TData>(model: Task<TData>, defaultValue?: TData): TData;
  <TData>(models: Task<TData>[], defaultValue?: TData[]): TData[];
  <TData>(models: Set<Task<TData>>, defaultValue?: TData[]): TData[];
  <TData>(models: Map<any, Task<TData>>, defaultValue?: TData[]): TData[];
  <TData, TResult>(
    model: Task<TData>,
    selector: (data: TData) => TResult,
    defaultValue?: TResult
  ): TResult;
  <TData, TResult>(
    models: Task<TData>[],
    selector: (data: TData[]) => TResult,
    defaultValue?: TResult
  ): TResult;
  <TData, TResult>(
    models: Set<Task<TData>>,
    selector: (data: TData[]) => TResult,
    defaultValue?: TResult
  ): TResult;
  <TData, TResult>(
    models: Map<any, Task<TData>>,
    selector: (data: TData[]) => TResult,
    defaultValue?: TResult
  ): TResult;
}

interface AsyncModelLoadContext extends Cancellable {
  signal: any;
}

interface Task<TData = any> {
  data: TData | undefined;
  error: any;
  loading: boolean;
  promise: CancellablePromise<TData> | undefined;
}

interface AsyncModel<TData = any, TParams extends any[] = any[]>
  extends Task<TData> {
  /**
   *
   * @param loader
   * @param timeout
   */
  load(
    loader?: (cancellable: AsyncModelLoadContext) => Promise<TData>,
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
  /**
   * merge incoming data and loaded data
   * @param next
   * @param prev
   */
  update(next: TData, prev: TData): TData;

  params: TParams;

  _onInit(): void;

  _onParamsChange(): void;
}

interface Async {
  <TData = any>(): AsyncModel<TData>;
  <TData = any, TParams extends any[] = any[]>(
    loader: (
      context: AsyncModelLoadContext,
      ...args: TParams
    ) => Promise<TData>,
    ...initialParams: TParams
  ): AsyncModel<TData>;
}

interface Cancellable {
  cancelled(): boolean;
  cancel(): void;
}

interface CancellablePromise<T = any> extends Promise<T>, Cancellable {}

const typeProp = "$$type";
const familyProp = "$family";
const noop = () => {};

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

interface Listenable {
  $listen(listener: VoidFunction): VoidFunction;
}

interface Notifier<TProps> {
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

interface State<T = any> {
  defaultValue: T | undefined;
  notifyChange: boolean;
}

type StateChangeArgs = { prop: string; state: State; value: any };

interface ModelApi<TProps extends {} = {}>
  extends Notifier<TProps>,
    Watchable<TProps>,
    Slicable<TProps> {
  readonly $model: Model<TProps>;
  readonly $props: TProps;

  /**
   * get state of specified prop
   * @param prop
   * @param state
   */
  $get<T>(prop: keyof TProps, state: State<T>): T | undefined;

  /**
   * change state of specified prop, when state value changed, model._onXXXStateChange called
   * @param prop
   * @param state
   * @param value
   */
  $set<T>(prop: keyof TProps, state: State<T>, value: T): void;

  /**
   * return dirty status of the model
   */
  $dirty(): boolean;
  /**
   * return dirty status of the specified prop
   * @param prop
   */
  $dirty(prop: keyof TProps): boolean;

  /**
   * return touched status of the model
   */
  $touched(): boolean;

  /**
   * return a touched status of specifid prop
   * @param prop
   */
  $touched(prop: keyof TProps): boolean;

  $invalid(): boolean;

  $invalid(prop: keyof TProps): any;

  $invalid(prop: keyof TProps, invalid: any): void;

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
      ? (props: T) => Partial<TProps> | void
      : (props: {
          [key in keyof TModel]: TModel[key];
        }) => Partial<TProps> | void,
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

  $observe(observer: Observer): VoidFunction;

  $when(
    filter: ActivityFilter<TProps> | ActivityFilter<TProps>[]
  ): CancellablePromise<ObserverArgs>;

  $when(observer: Observer): CancellablePromise<ObserverArgs>;

  $wrap(wrapper: Wrapper): this;

  $wrap(wrappers: Wrapper[]): this;

  $memo<TResult>(key: string, fn: () => TResult, deps?: any[]): TResult;

  $memo<TResult>(fn: () => TResult, deps?: any[]): TResult;

  $silent(): VoidFunction;

  $lock(): VoidFunction;

  /**
   * set the model data with hydrated data, if the model is already changed before, no hydration made
   * @param data
   */
  $hydrate(data: TProps): void;

  /**
   * get prop accessor of specified prop name
   * @param prop
   */
  $prop(prop: keyof TProps): Accessor<TProps[typeof prop], TProps>;

  toJSON(): TProps;
}

interface Slicable<TProps> {
  $slice<TResult extends Record<string, any>>(
    selector: (props: TProps) => TResult
  ): ModelSlice<TResult>;
}

type ModelSlice<TProps> = Readonly<TProps> &
  Notifier<TProps> &
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

  <T extends Listenable, TProps>(
    listenable: T,
    options?: Omit<UseModelOptions<TProps>, "update">
  ): T;

  (
    listenable: Listenable[],
    options?: Omit<UseModelOptions<any>, "update">
  ): void;

  <T, TResult>(
    listenable: T,
    selector: T extends Listenable
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
const foreverPromise = new Promise(noop);
const foreverLoader = () => foreverPromise;
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
  TContext extends TProps & Notifier<TContext> = any
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
): Notifier<TContext> {
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
  let slice: TProps & Notifier<TProps> & Watchable<TProps>;
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

function pascalCase(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

function hasProp(name: string, obj: any) {
  return name in obj || name[0].toLowerCase() + name.slice(1) in obj;
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
  let familyHydratedData: Map<any, any> | undefined;

  const activityEmitter = createEmitter();
  const changeEmitter = createEmitter();
  const cache = new Map<string, CacheItem>();
  const family = new Map<any, Model>();

  const wrappers: Wrapper[] = [];
  const invalid = new Map<string, any>();
  const allPropStates = new Map<string, Map<State<any>, any>>();
  const propAccessors = new Map<string, Accessor>();
  const notifyChange = () => {
    model._onChange?.();
    model._valAll?.();
    changeEmitter.emit();
  };

  let initialized = false;
  let api: InternalModelApi;
  let isCreating = true;
  let invokingMethodName: string | undefined;
  let slientRequests = 0;
  let lockers = 0;
  let touched = new Set<string>();

  const data: any = {};

  function emit(args: ObserverArgs) {
    activityEmitter.emit(args);
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

  function getPropStates(prop: string, shouldCreate = false) {
    let storage = allPropStates.get(prop);
    if (!storage) {
      if (shouldCreate) {
        storage = new Map();
        allPropStates.set(prop, storage);
      }
    }
    return storage;
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

  function familyMethod(
    method: keyof Model,
    args?: IArguments | any[] | false
  ): undefined | any[] {
    if (familyKeyProp) {
      if (args === false) {
        throw new Error(
          `The family model does not support this method ${method}`
        );
      }
      const result: any[] = [];
      family.forEach((member) => {
        const m: any = member[method];
        if (typeof m === "function") {
          result.push(m(...((args ?? []) as any)));
        }
      });
      return result as any;
    }
    return undefined;
  }

  function magicMethod<T>(
    prefix: string,
    name: string,
    postfix: string,
    invoker?: (method: Function) => T
  ) {
    const methodName = prefix + pascalCase(name) + postfix;
    const method = model[methodName];
    if (typeof method === "function") {
      if (invoker) {
        return invoker(method);
      }
      return method();
    }
  }

  function setInvalid(prop: string, value: any, invert: boolean) {
    // is error object
    if (typeof value === "object" && value) {
      // nothing to change
      if (invalid.get(prop) === value) return false;
      invalid.set(prop, value);
      return true;
    }

    if (typeof value === "undefined" || value === null) {
      return false;
    }

    if (invert) {
      value = !value;
    }
    if (value) {
      if (invalid.has(prop)) return false;
      invalid.set(prop, true);
      return true;
    }
    if (invalid.has(prop)) {
      invalid.delete(prop);
      return true;
    }
    return false;
  }

  function init() {
    if (initialized || isCreating) return;
    initialized = true;
    model._onInit?.();
  }

  const modelGetter = () => model;

  // create api methods
  api = {
    [typeProp]: () => modelType,

    ...createListenable(modelGetter, changeEmitter, init),
    ...createWatchable(modelGetter),
    ...createSlicable(modelGetter),
    $props: props,
    $invalid(prop?, value?) {
      if (!arguments.length) return !!invalid.size;
      if (arguments.length < 2) {
        return invalid.get(prop as any);
      }
      if (setInvalid(prop as any, value, false)) {
        notifyChange();
      }
    },
    $dirty(prop?: any) {
      familyMethod("$dirty", false);

      if (!prop) {
        return changeToken !== initialToken;
      }
      return props[prop] !== data[prop];
    },
    $touched(prop?) {
      familyMethod("$touched", false);

      if (!prop) return !!touched.size;
      return touched.has(prop as any);
    },
    $data() {
      familyMethod("$data", false);

      return data;
    },
    $$initMember(key: any, family: Map<any, Model>) {
      let removed = false;
      const memberModel = Object.assign(model as MemberModel, {
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
          emit({ type: "remove", model: memberModel, key });
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
      const familyResult: VoidFunction[] | undefined = familyMethod("$silent");

      if (familyResult) {
        return () => familyResult.forEach((x) => x());
      }

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
      const familyResult: VoidFunction[] | undefined = familyMethod("$lock");

      if (familyResult) {
        return () => familyResult.forEach((x) => x());
      }

      let active = true;
      lockers++;
      return () => {
        if (!active) return;
        lockers--;
      };
    },
    $sync(input, selector, mode) {
      familyMethod("$sync", false);

      let handleChange: VoidFunction;
      const unsubscribes: VoidFunction[] = [];
      const models: Model[] = [];

      if (isModel(input)) {
        const model = input as unknown as Model;
        handleChange = () => {
          const update = selector(model as any);
          update && assign(update);
        };
        models.push(model);
      } else {
        handleChange = () => {
          const update = selector(input);
          update && assign(update);
        };
        models.push(...(Object.values(input) as Model[]));
      }

      const wrappedHandler = mode
        ? (mode(handleChange) as VoidFunction)
        : handleChange;

      unsubscribes.push(
        ...models.map((model) => model.$listen(wrappedHandler))
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
      const familyResult = familyMethod("$call", arguments);
      if (familyResult) return familyResult[0];

      return call(fn, args);
    },
    $observe: activityEmitter.add,
    $when(input) {
      let unsubscribe: Function | undefined;
      const cancellalbe = createCancellable(() => unsubscribe?.());
      return Object.assign(
        new Promise<ObserverArgs>((resolve) => {
          let observer: Observer;
          if (typeof input === "function") {
            observer = input;
          } else {
            const filter: ActivityFilter[] = Array.isArray(input)
              ? input
              : [input];
            observer = (o) => {
              if (
                filter.some((x) => {
                  if (typeof x === "string") {
                    if (o.type === "call" && o.method === x) return true;
                    if (o.type === "write" && o.key === x) return true;
                    return false;
                  }

                  if (
                    x.type === "call" &&
                    o.type === "call" &&
                    x.method === o.method
                  ) {
                    return true;
                  }

                  if (
                    x.type === "read" &&
                    o.type === "read" &&
                    x.key === o.key
                  ) {
                    return true;
                  }

                  if (
                    x.type === "write" &&
                    o.type === "write" &&
                    x.key === o.key
                  ) {
                    return true;
                  }

                  if (
                    x.type === "remove" &&
                    o.type === "remove" &&
                    x.key === o.key
                  ) {
                    return true;
                  }

                  return false;
                })
              ) {
                cancellalbe.cancel();
                resolve(o);
              }
            };
          }
          unsubscribe = activityEmitter.add(observer);
        }),
        cancellalbe
      );
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
      if (familyMethod("$reset", arguments)) return;
      call(() => {
        changeToken = initialToken;
        cache.clear();
        allPropStates.clear();
        touched.clear();
        invalid.clear();
        if (hardReset) {
          family.clear();
          changeEmitter.clear();
        }
        assign(props, data);
        initialized = false;
        notifyChange();
      });
    },
    $merge(props: any, lazy?: boolean) {
      if (familyMethod("$merge", arguments)) return;
      call(assign, [props], !!lazy);
    },
    $memo(...args: any[]) {
      let key = invokingMethodName;
      if (!key) {
        throw new Error("$memo must be called in side model method");
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
    $hydrate(hydratedData) {
      // is family
      if (familyKeyProp) {
        if (!Array.isArray(hydratedData)) {
          throw new Error("Invalid hydrated data for family model");
        }
        familyHydratedData = new Map(hydratedData);
      } else {
        const prevSize = touched.size;
        Object.entries(hydratedData).forEach(([key, value]) => {
          if (touched.has(key)) return;
          if (data[key] === value) return;
          data[key] = value;
          touched.add(key);
        });
        // has change
        if (touched.size !== prevSize) {
          notifyChange();
        }
      }
    },
    $get(prop, state) {
      const states = getPropStates(prop);
      if (!states || !states.has(state)) return state.defaultValue;
      return states.get(state);
    },
    $set(prop, state, value) {
      const storage = getPropStates(prop, true)!;
      if (!storage.has(state) || storage.get(state) !== value) {
        storage.set(state, value);
        const e: StateChangeArgs = { prop, state, value };
        magicMethod("_on", prop, "StateChange", (m) => m(e));
        model._onStateChange?.(e);
        if (state.notifyChange) {
          notifyChange();
        }
      }
    },
    $prop(prop: any): any {
      let accessor = propAccessors.get(prop);
      if (!accessor) {
        accessor = createAccessor(model, prop);
        propAccessors.set(prop, accessor);
      }
      return accessor;
    },
  };

  // is family model
  if (familyKeyProp) {
    const compareFn = getCompareFunction(familyKeyCompare, keyCompare);

    const findMember = <T>(
      map: Map<any, T>,
      key: any
    ): [any, T | undefined] => {
      if (key && (Array.isArray(key) || typeof key === "object")) {
        const keyIterator = map.entries();
        while (true) {
          const { value, done } = keyIterator.next();
          if (done) break;
          if (compareFn(value[0], key)) {
            return value;
          }
        }
        return [, undefined];
      } else {
        return [key, map.get(key)];
      }
    };

    // add special props for family model
    Object.assign(api, {
      [familyProp]: (key: any) => {
        let [mapKey = key, member] = findMember(family, key);
        if (!member) {
          const [, hydratedData] = familyHydratedData
            ? findMember(familyHydratedData, mapKey)
            : [];

          member = create({
            ...props,
            ...hydratedData,
            [familyKeyProp as string]: key,
          });

          (member as unknown as InternalModelApi).$$initMember(mapKey, family);
          family.set(mapKey, member);
        }
        return member;
      },
    });
  }

  model = {
    ...api,
    listen: api.$listen,
  } as any;

  const initialProps: any = { ...props };
  const propsMetas: Record<string, PropMeta> = {};
  const onCreates: VoidFunction[] = [];
  // injector must run before property bindings
  globalInjectors?.forEach((injector) => {
    const result = injector(api, initialProps);
    if (typeof result === "function") {
      onCreates.push(result);
    }
  });

  // bind props
  Object.keys(initialProps).forEach((key) => {
    const value = initialProps[key];

    if (key.startsWith("$meta")) {
      Object.assign(propsMetas, value);
      return;
    }

    const firstChar = key[0];

    if (firstChar === "$") return;

    if (process.env.NODE_ENV !== "production") {
      if (firstChar === "_") {
        if (key.startsWith("_get") || key.startsWith("_set")) {
          if (!hasProp(key.slice(4), initialProps)) {
            console.warn(`No prop is matched for setter/getter ${key}`);
          }
        } else if (
          key !== "_onChange" &&
          key !== "_onStateChange" &&
          key.startsWith("_on")
        ) {
          if (key.endsWith("StateChange")) {
            if (!hasProp(key.slice(3, -11), initialProps)) {
              console.warn(
                `No prop is matched for state change handler ${key}`
              );
            }
          } else if (key.endsWith("Change")) {
            if (!hasProp(key.slice(3, -6), initialProps)) {
              console.warn(
                `No prop is matched for value change handler ${key}`
              );
            }
          }
        } else if (key !== "_valAll" && key.startsWith("_val")) {
          if (!hasProp(key.slice(8), initialProps)) {
            console.warn(`No prop is matched for validator ${key}`);
          }
        }
      }
    }

    // method
    if (typeof value === "function") {
      let method = value;

      wrappers.forEach((wrapper) => {
        method = wrapper(method, model);
      });

      model[key] = (...args: any[]) => {
        emit({
          type: "call",
          method: method.displayName || method.name || method.toString(),
          args,
        });
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
      firstChar === "_" ||
      firstChar === "#" ||
      firstChar === "!" ||
      firstChar === "~" ||
      firstChar === "&" ||
      firstChar === "*" ||
      firstChar === "%"
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
      const getterKey = "_get" + pascalCase(key);
      const setterKey = "_set" + pascalCase(key);
      const hasGetter = typeof props[getterKey] === "function";
      const hasSetter = typeof props[setterKey] === "function";
      // public prop
      Object.defineProperty(model, key, {
        enumerable: true,
        get: () => {
          init();
          emit({ type: "read", key });
          return hasGetter ? model[getterKey]() : data[key];
        },
        set: (value: any) => {
          if (hasGetter && !hasSetter) {
            throw new Error(`The prop ${key} is readonly`);
          }
          if (lockers) return;
          init();
          emit({ type: "write", key, value });
          if (hasSetter) {
            if (model[setterKey](value) === false) return;
          }
          if (value === data[key]) return;
          data[key] = value;
          touched.add(key);
          changeToken = {};
          // trigger individual prop change event
          magicMethod("_on", key, "Change");
          magicMethod("_val", key, "", (m) => {
            try {
              const result = m();
              if (typeof result?.then === "function") {
                result.then(
                  (resolved: any) => {
                    // there is something changed since last time
                    if (value !== data[key]) return;
                    setInvalid(key, resolved, true);
                  },
                  (rejected: any) => {
                    // there is something changed since last time
                    if (value !== data[key]) return;
                    setInvalid(key, rejected, true);
                  }
                );
              } else {
                setInvalid(key, result, true);
              }
            } catch (e) {
              setInvalid(key, e, true);
            }
          });
          if (updatingJobs) return;
          notifyChange();
        },
      });
    }

    data[key] = value;
  });

  Object.keys(propsMetas).forEach((key) => {
    let options = propsMetas[key];

    if (!(key in model)) {
      console.warn(`No prop is matched for the ${key} meta`);
      return;
    }

    if (typeof options === "function") {
      options = { mode: options };
    }

    const method = model[key];

    if (typeof method === "function") {
      if (options.mode) {
        model[key] = options.mode(method);
      }
    }
  });

  isCreating = false;

  onCreates.forEach((x) => x());

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
  const listenableRef = React.useRef<Listenable>();
  const rerender = React.useState<any>()[1];
  const optionsRef = React.useRef<UseModelOptions>({});
  const selectorRef = React.useRef<Function>();
  const compareFnRef = React.useRef<Comparer>();
  const errorRef = React.useRef<any>();
  const listeners: Listenable[] = [];
  const renderingRef = React.useRef(true);
  let creator: Function | undefined;
  let inputOptions: UseModelOptions | undefined;
  renderingRef.current = true;

  // useModel(creator)
  if (typeof args[0] === "function") {
    creator = args[0];
    if (!listenableRef.current) {
      listenableRef.current = create(creator?.(create));
    }
    inputOptions = args[1];
    listeners.push(listenableRef.current!);
  } else {
    // useModel(models, options)
    if (Array.isArray(args[0])) {
      args[0]
        .filter((x) => !!x)
        .forEach((model) => {
          if (listeners.includes(model)) return;
          listeners.push(model);
        });
      inputOptions = args[1];
    } else if (args[0]) {
      // useModel(listener, selector, compareFn)
      if (typeof args[0]?.$listen === "function") {
        const listenable: Listenable = (listenableRef.current = args[0]);

        // useModel(listener, selector, compareFn)
        if (typeof args[1] === "function") {
          const selector: Function = args[1];
          selectorRef.current = () => selector(listenable);
          compareFnRef.current = args[2];
        } else {
          // useModel(model, options)
          inputOptions = args[1];
        }
        listeners.push(args[0]);
      } else {
        // useModel(models, selector, compareFn)
        if (typeof args[1] === "function") {
          const modelMap: Record<string, Model> = args[0];
          const selector: Function = args[1];
          selectorRef.current = () => {
            return selector(modelMap);
          };
          compareFnRef.current = args[2];
          listeners.push(...Object.values(modelMap));
        } else {
          // useModel(props, options)
          // useModel(props, update, options)
          const props = args[0];
          if (!listenableRef.current) {
            listenableRef.current = create(props);
          }
          listeners.push(listenableRef.current);
          if (typeof args[1] === "function") {
            inputOptions = { update: args[1], ...args[2] };
          } else {
            inputOptions = args[1];
          }
        }
      }
    }

    if (!listeners.length) {
      throw new Error("No model spcified");
    }
  }

  optionsRef.current =
    (typeof inputOptions === "function"
      ? { update: inputOptions }
      : inputOptions) ?? {};

  effectHook(() => {
    let prevValue: any;
    const handleChange = (listenable: Listenable) => {
      errorRef.current = undefined;

      try {
        if (renderingRef.current) return;
        optionsRef.current.onChange?.(listenable);

        // has selector
        if (selectorRef.current) {
          const nextValue = selectorRef.current(...listeners);
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
    const unsubscribes = listeners.map((model) =>
      model.$listen(() => handleChange(model))
    );
    return () => {
      unsubscribes.forEach((x) => x());
    };
  }, listeners);

  if (optionsRef.current.update) {
    if (isModel(listenableRef.current)) {
      listenableRef.current?.$merge(
        typeof optionsRef.current.update === "function"
          ? optionsRef.current.update(listenableRef.current)
          : optionsRef.current.update
      );
    }
  }

  renderingRef.current = false;

  if (errorRef.current) {
    const error = errorRef.current;
    errorRef.current = undefined;
    throw error;
  }

  if (selectorRef.current) {
    return selectorRef.current(...listeners);
  }

  return listeners[0];
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
  return (f) => {
    let lastPromise: Promise<any> | undefined;
    const resolved = Promise.resolve();
    return function (this: any) {
      if (lastPromise) {
        if (afterDone) {
          return (lastPromise = lastPromise.finally(() =>
            f.apply(this, arguments)
          ));
        }
        return (lastPromise = lastPromise.then(() => f.apply(this, arguments)));
      }
      const result = f.apply(this, arguments);
      if (typeof result?.then === "function") {
        return (lastPromise = result);
      }
      return resolved;
    };
  };
}

function droppable(): ConcurrentMode {
  return (f, cancel) => {
    let calling = false;
    return function (this: any) {
      if (calling) {
        cancel?.();
        return;
      }
      calling = true;
      let isAsync = false;
      try {
        const result = f.apply(this, arguments);
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
  };
}

function debounce(ms: number = 0): ConcurrentMode {
  return (f, cancel) => {
    let timer: any;
    return function (this: any) {
      cancel?.();
      clearTimeout(timer);
      return Object.assign(
        new Promise((resolve, reject) => {
          timer = setTimeout(() => {
            try {
              resolve(f.apply(this, arguments));
            } catch (e) {
              reject(e);
            }
          }, ms);
        }),
        {
          cancel() {
            cancel?.();
            clearTimeout(timer);
          },
        }
      );
    };
  };
}

function once(): ConcurrentMode {
  return (f) => {
    let called = false;
    let lastResult: any;
    return function (this: any) {
      if (called) return lastResult;
      called = true;
      return (lastResult = f.apply(this, arguments));
    };
  };
}

function throttle(ms: number): ConcurrentMode {
  return (f) => {
    let lastTime: number;
    let lastResult: any;
    return function (this: any) {
      const now = Date.now();
      if (!lastTime || lastTime + ms < now) {
        lastTime = now;
        lastResult = f.apply(this, arguments);
      }
      return lastResult;
    };
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

const sync: Sync = (models: any, ...args: any[]) => {
  let selector: Function | undefined;
  let defaultValue: any;
  let hasDefaultValue = false;
  let multiple = true;
  let array: Task[];

  if (typeof args[0] === "function") {
    [selector, defaultValue] = args;
    hasDefaultValue = args.length > 1;
  } else {
    defaultValue = args[0];
    hasDefaultValue = !!args.length;
  }

  if (Array.isArray(models)) {
    array = models;
  } else if (models instanceof Set) {
    array = Array.from(models);
  } else if (models instanceof Map) {
    array = Array.from(models.values());
  } else {
    multiple = false;
    array = [models];
  }

  let error: any;

  array.some((model) => {
    error = model.error;
    return !!error;
  });

  if (error) {
    if (hasDefaultValue) return defaultValue;
    throw error;
  }

  let loading = false;
  array.some((model) => {
    loading = model.loading;
    return loading;
  });

  if (loading) {
    if (hasDefaultValue) return defaultValue;
    if (multiple) {
      throw Promise.all(array.map((model) => model.promise));
    }
    throw array[0].promise;
  }

  if (selector) {
    if (multiple) {
      return selector(array.map((model) => model.data));
    }
    return selector(array[0].data);
  }

  return multiple ? array.map((model) => model.data) : array[0].data;
};

const async: Async = (
  loader?: Function,
  ...initialParams: any[]
): AsyncModel => {
  const props: AsyncModel = {
    data: undefined,
    loading: false,
    error: undefined,
    promise: undefined,
    params: initialParams,
    update(next) {
      return next;
    },
    onLoad() {},
    onSuccess() {},
    onError() {},
    onDone() {},
    cancel() {
      if (!this.loading) return;
      (this as any)._token = {};
      this.promise?.cancel();
      this.promise = undefined;
      this.loading = false;
    },
    load(fn: Function = foreverLoader, timeout) {
      this.loading = true;
      this.error = undefined;
      let timer: any;
      const token = ((this as any)._token = {});
      const model = of(this);
      const abortController =
        typeof AbortController !== "undefined"
          ? new AbortController()
          : undefined;
      const cancellable = createCancellable(() => {
        clearTimeout(timer);
        abortController?.abort();
      });

      model.onLoad();

      const promise: CancellablePromise = Object.assign(
        new Promise((resolve, reject) => {
          fn(
            Object.assign(cancellable, { signal: abortController?.signal }),
            ...this.params
          ).then(
            (data: any) => {
              if (token !== (this as any)._token) return;
              model.$merge({
                loading: false,
                data: model.update(data, model.data),
              });
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
      promise.catch(noop);

      // timeout enabled
      if (timeout) {
        timer = setTimeout(cancellable.cancel, timeout);
      }

      return (model.promise = promise);
    },
    _onInit() {
      if (loader) {
        this.load(loader as any);
      }
    },
    _onParamsChange() {
      this._onInit();
    },
  };

  return props;
};

function state<T>(defaultValue?: T, notifyChange?: boolean): State<T> {
  return {
    defaultValue,
    notifyChange: notifyChange ?? true,
  };
}

function createAccessor<TValue = any, TProps = AnyProps>(
  model: Model<TProps>,
  prop: keyof TProps
): Accessor<TValue> {
  return {
    get model() {
      return model;
    },
    get value(): any {
      return model[prop];
    },
    set value(value) {
      model[prop] = value;
    },
    get invalid() {
      return model.$invalid(prop);
    },
    set invalid(value: any) {
      model.$invalid(prop, value);
    },
    get(state) {
      return model.$get(prop, state);
    },
    set(state, value) {
      model.$set(prop, state, value);
    },
    $listen(listener) {
      return model.$listen(prop, listener);
    },
  };
}

export {
  Model,
  ModelApi,
  UseModel,
  Wrapper,
  ModelSlice,
  Accessor,
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
  state,
};
