import * as React from "react";

type Observer = (type: "read" | "write" | "call", value: any) => void;
type Wrapper = (next: Function, model: Model) => Function;
type Injector = <TProps>(api: ModelApi<TProps>, props: TProps) => void;
type CompareFn<T = any> = (a: T, b: T) => boolean;

const typeProp = "$$type";
const keyProp = "$key";
const dataProp = "$data";
const modelProp = "$model";

interface ModelBase {
  onInit?(): void;
  onCreate?(): void;
  onSubscribe?(): void;
  onUbsubscribe?(): void;
  [key: string]: any;
}

type Data<T> = { [key in keyof T]: T[key] extends Function ? never : T[key] };

interface ModelApi<TModel extends ModelBase = {}> {
  [keyProp]: any;
  [modelProp](): Model<TModel>;
  [dataProp](): Data<TModel>;
  /**
   * clone to new model
   */
  $extend(): Model<TModel>;

  /**
   * extend current model
   * @param props
   */
  $extend<TNewModel extends ModelBase>(
    props: TNewModel
  ): Model<TModel & TNewModel>;

  $extend<TNewModel extends ModelBase, TBaseProp extends string>(
    props: TNewModel,
    baseProp: TBaseProp
  ): Model<
    TModel &
      TNewModel & {
        [key in TBaseProp]: {
          [key in keyof TModel]: TModel[key] extends Function
            ? TModel[key]
            : never;
        };
      }
  >;

  /**
   * Reset all props of the model to initial values
   */
  $reset(): void;

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
  $listen(prop: keyof TModel, listener: VoidFunction): VoidFunction;

  /**
   * Register listener to listen model props changed event.
   * The listener will be called when some of specified props are changged
   * @param props
   * @param listener
   */
  $listen(props: (keyof TModel)[], listener: VoidFunction): VoidFunction;

  /**
   * The callback will be called when selected value which is returned from the selector is changed.
   * @param selector
   * @param callback
   * @param compareFn
   */
  $watch<TResult>(
    selector: (model: TModel) => TResult,
    callback: (result: TResult) => void,
    compareFn?: (a: TResult, b: TResult) => boolean
  ): VoidFunction;

  $call<TArgs extends any[], TResult>(
    fn: (...args: TArgs) => TResult,
    ...args: TArgs
  ): TResult;

  $wait<TResult = void>(
    selector?: (model: TModel) => TResult,
    compareFn?: CompareFn<TResult>
  ): Promise<TResult>;

  /**
   * Assign specified props to the model.
   * Change event will be triggered once all props are assigned
   * @param props
   * @param lazy
   */
  $assign(props: Partial<TModel>, lazy?: boolean): void;

  $batch(updater: (model: Model<TModel>) => void, lazy?: boolean): void;

  $observe(observer: Observer): this;
  $observe(observers: Observer[]): this;
  $wrap(wrapper: Wrapper): this;
  $wrap(wrappers: Wrapper[]): this;
}

interface InternalModelApi<TModel extends ModelBase = {}>
  extends ModelApi<TModel> {
  [typeProp]: any;
}

type Model<T extends ModelBase = {}> = {
  [key in keyof T]: T[key] extends (...args: any[]) => any
    ? T[key] extends (...args: infer TArgs) => (model: Model) => infer TResult
      ? (...args: TArgs) => TResult
      : T[key]
    : T[key];
} & ModelApi<T>;

type FamilyModel<T extends ModelBase = {}> = Model<T> & {
  $family(key: any): Model<T>;
};

interface CreateOptions {
  key?: any;
  family?: boolean | CompareFn;
}

interface Create {
  <TModel extends ModelBase, TOptions extends CreateOptions>(
    props: TModel,
    options?: TOptions
  ): TOptions extends { family: true | CompareFn }
    ? FamilyModel<TModel>
    : Model<TModel>;
}

interface UseModel {
  <TModel extends ModelBase>(
    creator: (create: Create) => TModel,
    options?: UseModelOptions<TModel>
  ): Model<TModel>;

  <TModel extends ModelBase>(
    creator: (create: Create) => TModel,
    autoUpdate: boolean
  ): Model<TModel>;

  <TModel extends ModelBase>(
    creator: (create: Create) => TModel,
    updater?: (prev: TModel) => Partial<TModel>
  ): Model<TModel>;

  <TModel>(
    model: Model<TModel>,
    options?: Omit<UseModelOptions<TModel>, "updater">
  ): void;

  (models: Model[], options?: Omit<UseModelOptions<any>, "updater">): void;
}

interface UseModelOptions<TModel extends ModelBase = {}> {
  onChange?: (model: TModel) => void;
  updater?: (prev: TModel) => Partial<TModel>;
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

function keyCompare(a: any, b: any) {
  return shallowCompare(a, b);
}

/**
 * check the value is whether model or not
 * @param value
 * @returns
 */
function isModel(value: any) {
  return value?.[typeProp]?.() === modelType;
}

/**
 * create a model with specified props
 * @param props
 * @returns
 */
const create: Create = (props, options) => {
  if (!props) throw new Error("Invalid model props");
  if (isModel(props)) return props;

  let updatingJobs = 0;
  let changeToken = {};
  let model: any;
  let initialized = false;
  let api: InternalModelApi;
  let isCreating = true;
  const family = new Map<any, Model>();
  const observers: Observer[] = [];
  const listeners: Function[] = [];
  const wrappers: Wrapper[] = [];
  const notifyChange = () => {
    model?.onChange?.();
    listeners.slice().forEach((x) => x());
  };

  // clone prop
  const data: any = {};

  function emit(...args: Parameters<Observer>) {
    const [type, value] = args;
    observers.forEach((o) => o(type, value));
  }

  function assign(props: any) {
    if (props === model) return;

    Object.keys(props).forEach((key) => {
      const value = props[key];
      if (
        // internal methods / props
        key[0] === "$" ||
        typeof value === "function" ||
        // not exist key
        !(key in model)
      ) {
        return;
      }
      if (isModel(model[key])) {
        model[key].$assign(value);
      } else {
        model[key] = value;
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
    if (model.onInit) {
      call(model.onInit);
    }
  }

  api = {
    [typeProp]: () => modelType,
    get [keyProp]() {
      return options?.key;
    },
    [dataProp]: () => data,
    get [modelProp]() {
      if (isCreating && model) {
        throw new Error(
          "Model is not ready. It seems you are trying to access the $model inside injector"
        );
      }
      return model;
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
    $extend(newProps?: any, baseProp?: string) {
      if (!newProps) return create(props);
      if (baseProp) {
        return create({ ...props, [baseProp]: props, ...newProps });
      }
      return create({ ...props, ...newProps });
    },
    $batch(updater, lazy) {
      init();
      call(updater, [model], !!lazy);
    },
    $wait(selector?, compareFn = strictCompare): any {
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
    $watch(selector, callback, compareFn = strictCompare) {
      let prev = selector(model);
      return api.$listen(() => {
        const next = selector(model);
        if (!compareFn(prev, next)) {
          prev = next;
          call(callback, [next]);
        }
      });
    },
    $reset() {
      call(() => {
        family.clear();
        assign(props);
        initialized = false;
      });
    },
    $listen(...args: any[]) {
      let listener: Function;

      init();

      if (typeof args[0] !== "function") {
        if (Array.isArray(args[0])) {
          const prev: Record<string, any> = {};
          const props = args[0];
          const originListener = args[1];

          const updatePrevValues = () =>
            props.forEach((prop) => (prev[prop] = model[prop]));

          updatePrevValues();

          listener = () => {
            if (props.some((prop) => prev[prop] !== model[prop])) {
              updatePrevValues();
              originListener();
            }
          };
        } else {
          const prop = args[0];
          const originListener = args[1];
          let prev = model[prop];
          listener = () => {
            if (model[prop] === prev) return;
            prev = model[prop];
            originListener();
          };
        }
      } else {
        listener = args[0];
      }
      if (model.onSubscribe) {
        call(model.onSubscribe);
      }

      listeners.push(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        const index = listeners.indexOf(listener);
        listeners.splice(index, 1);
        if (model.onUnsubscribe) {
          call(model.onUnsubscribe);
        }
      };
    },
    $assign(props: any, lazy?: boolean) {
      call(assign, [props], !!lazy);
    },
  };

  if (options?.family) {
    const compareFn =
      typeof options.family === "function" ? options.family : keyCompare;

    (api as any).$family = (key: any) => {
      let member: Model | undefined;
      if (key && (Array.isArray(key) || typeof key === "object")) {
        const keyIterator = family.entries();
        while (true) {
          const { value, done } = keyIterator.next();
          if (done) break;
          if (compareFn(value[0], key)) {
            member = value[1];
            break;
          }
        }
      } else {
        member = family.get(key);
      }
      if (!member) {
        member = create(props, { key });
        family.set(key, member);
      }
      return member;
    };
  }

  model = {
    ...api,
    get key() {
      return options?.key;
    },
  };

  // injector must run before property bindings
  globalInjectors?.forEach((injector) => injector(api, props));

  Object.keys(props).forEach((key) => {
    // skip special props
    if (key[0] === "$") {
      return;
    }
    // private prop
    if (key[0] === "_") {
      model[key] = data[key];
      return;
    }

    const value = props[key];

    // method
    if (typeof value === "function") {
      let method = value;

      wrappers.forEach((wrapper) => {
        method = wrapper(method, model);
      });

      model[key] = (...args: any[]) => {
        emit("call", value);
        return call(method, args);
      };
      return;
    }

    // public prop
    Object.defineProperty(model, key, {
      enumerable: true,
      get: () => {
        init();
        emit("read", key);
        return data[key];
      },
      set: (value: any) => {
        init();
        emit("write", { prop: key, value });
        if (value === data[key]) return;
        data[key] = value;
        changeToken = {};
        if (updatingJobs) return;
        notifyChange();
      },
    });

    data[key] = value;
  });

  isCreating = false;

  if (!options?.family) {
    if (model.onCreate) {
      call(model.onCreate);
    }
  }

  return model;
};

const useModel: UseModel = (...args: any[]): any => {
  // useModel(creator)
  const isCreatorMode = typeof args[0] === "function";
  const modelRef = React.useRef<Model>();
  const rerender = React.useState<any>()[1];
  const optionsRef = React.useRef<UseModelOptions>({});
  const models: Model[] = [];
  const renderingRef = React.useRef(true);
  let creator: Function | undefined;
  renderingRef.current = true;

  if (isCreatorMode) {
    creator = args[0];
    if (!modelRef.current) {
      modelRef.current = create(creator?.(create));
    }
    models.push(modelRef.current!);
  } else {
    if (Array.isArray(args[0])) {
      args[0]
        .filter((x) => !!x)
        .forEach((model) => {
          if (models.includes(model)) return;
          models.push(model);
        });
    } else if (args[0]) {
      modelRef.current = args[0];
      models.push(args[0]);
    }

    if (!models.length) {
      throw new Error("No model spcified");
    }
  }

  optionsRef.current =
    // autoUpdate
    (typeof args[1] === "boolean"
      ? {
          updater: creator
            ? args[1]
              ? () => creator?.(create)
              : undefined
            : undefined,
        }
      : typeof args[1] === "function"
      ? { updater: args[1] }
      : args[1]) ?? {};

  effectHook(() => {
    const handleChange = (model: Model) => {
      if (renderingRef.current) return;
      optionsRef.current.onChange?.(model);
      rerender({});
    };
    const unsubscribes = models.map((model) =>
      model.$listen(() => handleChange(model))
    );
    return () => {
      unsubscribes.forEach((x) => x());
    };
  }, models);

  if (optionsRef.current.updater) {
    modelRef.current?.$assign(optionsRef.current.updater(modelRef.current));
  }

  renderingRef.current = false;

  return models[0];
};

/**
 * register injectors that will inject to the model at the creating phase
 * @param injectors
 */
function inject(injectors: Injector | Injector[]) {
  globalInjectors = Array.isArray(injectors) ? injectors : [injectors];
}

export {
  Model,
  ModelApi,
  UseModel,
  Wrapper,
  isModel,
  useModel,
  create,
  inject,
  shallowCompare,
  strictCompare,
};
