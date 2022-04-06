import * as React from "react";

type Observer = (type: "read" | "write" | "call", value: any) => void;
type Wrapper = (next: Function, model: Model) => Function;
type Injector = <TProps>(api: ModelApi<TProps>, props: TProps) => void;

const typeProp = "$$type";

interface ModelApi<TModel extends {} = {}> {
  /**
   * clone to new model
   */
  $clone(): Model<TModel>;

  /**
   * extend current model
   * @param props
   */
  $extend<TNewModel extends {}>(props: TNewModel): Model<TModel & TNewModel>;

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

  $wait<TResult>(
    selector: (model: TModel) => TResult,
    compareFn?: (a: TResult, b: TResult) => boolean
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

interface InternalModelApi<TModel = {}> extends ModelApi<TModel> {
  [typeProp]: any;
}

type Model<T = {}> = {
  [key in keyof T]: T[key] extends (...args: any[]) => any
    ? T[key] extends (...args: infer TArgs) => (model: Model) => infer TResult
      ? (...args: TArgs) => TResult
      : T[key]
    : T[key];
} & ModelApi<T>;

interface CreateModel {
  <TModel extends {}>(props: TModel): Model<TModel>;
}

interface UseModel {
  <TModel extends {}>(
    creator: (create: CreateModel) => TModel,
    options?: UseModelOptions<TModel>
  ): Model<TModel>;

  <TModel extends {}>(
    creator: (create: CreateModel) => TModel,
    autoUpdate: boolean
  ): Model<TModel>;

  <TModel extends {}>(
    creator: (create: CreateModel) => TModel,
    updater?: (prev: TModel) => Partial<TModel>
  ): Model<TModel>;

  <TModel>(
    model: Model<TModel>,
    options?: Omit<UseModelOptions<TModel>, "updater">
  ): void;

  (models: Model[], options?: Omit<UseModelOptions<any>, "updater">): void;
}

interface UseModelOptions<TModel extends {} = {}> {
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

/**
 * check the value is whether model or not
 * @param value
 * @returns
 */
function isModel(value: any) {
  return value?.[typeProp] === modelType;
}

/**
 * create a model with specified props
 * @param props
 * @returns
 */
const create: CreateModel = (props) => {
  if (!props) throw new Error("Invalid model props");
  if (isModel(props)) return props;

  let updatingJobs = 0;
  let changeToken = {};
  let model: any;
  let initialized = false;
  let api: InternalModelApi;
  const observers: Observer[] = [];
  const listeners: Function[] = [];
  const wrappers: Wrapper[] = [];
  const notify = () => listeners.slice().forEach((x) => x());

  // clone prop
  const values: any = { ...props };

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

  function call(method: Function, args: any[], lazy: boolean) {
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
            notify();
          });
        } else {
          notify();
        }
      }
    }
  }

  api = {
    [typeProp]: undefined,
    $observe(input) {
      observers.push(...(Array.isArray(input) ? input : [input]));
      return this;
    },
    $wrap(input) {
      wrappers.push(...(Array.isArray(input) ? input : [input]));
      return this;
    },
    $clone() {
      return create(props);
    },
    $extend(newProps) {
      return create({ ...props, ...newProps });
    },
    $batch(updater, lazy) {
      call(updater, [model], !!lazy);
    },
    $wait(selector, compareFn = strictCompare): any {
      let prev = selector(model);
      let cancel: Function | undefined;
      const promise = new Promise((resolve) => {
        cancel = api.$listen(() => {
          const next = selector(model);
          if (!compareFn(prev, next)) {
            prev = next;
            cancel?.();
            resolve(next);
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
          call(callback, [next], false);
        }
      });
    },
    $reset() {
      call(
        () => {
          assign(props);
          if (initialized) {
            model.onInit?.();
          }
        },
        [],
        false
      );
    },
    $listen(...args: any[]) {
      let listener: Function;
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
      if (!initialized) {
        initialized = true;
        model.onInit?.();
      }

      model.onConnected?.();
      listeners.push(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        const index = listeners.indexOf(listener);
        listeners.splice(index, 1);
        model.onDisconnected?.();
      };
    },
    $assign(props: any, lazy?: boolean) {
      call(assign, [props], !!lazy);
    },
  };

  model = { ...api };

  Object.defineProperty(model, typeProp, {
    enumerable: false,
    get: () => modelType,
  });

  // injector must run before property bindings
  globalInjectors?.forEach((injector) => injector(api, props));

  Object.keys(values).forEach((key) => {
    // skip special props
    if (key[0] === "$") {
      return;
    }
    // private prop
    if (key[0] === "_") {
      model[key] = values[key];
      return;
    }

    // method
    if (typeof values[key] === "function") {
      let method = values[key];

      wrappers.forEach((wrapper) => {
        method = wrapper(method, model);
      });

      model[key] = (...args: any[]) => {
        emit("call", values[key]);
        return call(method, args, false);
      };
      return;
    }

    // public prop
    Object.defineProperty(model, key, {
      enumerable: true,
      get: () => {
        emit("read", key);
        return values[key];
      },
      set: (value: any) => {
        emit("write", { prop: key, value });
        if (value === values[key]) return;
        values[key] = value;
        changeToken = {};
        if (updatingJobs) return;
        notify();
      },
    });
  });

  model.onCreate?.();

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
 * register injectors that will inject to the model at the initializing phase
 * @param injectors
 */
function inject(...injectors: Injector[]) {
  globalInjectors = injectors;
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
