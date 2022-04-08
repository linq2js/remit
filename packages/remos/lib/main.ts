import * as React from "react";

type Observer = (type: "read" | "write" | "call", value: any) => void;
type Wrapper = (next: Function, model: Model) => Function;
type Injector = <TProps>(api: ModelApi<TProps>, props: TProps) => void;
type Comparer<T = any> = (a: T, b: T) => boolean;
type PropsOnly<T> = {
  [key in keyof T]: T[key] extends Function ? never : T[key];
};

type Data<T> = { [key in keyof T]: T[key] extends Function ? never : T[key] };

type Call = <TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult,
  ...args: TArgs
) => TResult;

type Model<TProps extends ModelProps = {}> = {
  [key in keyof TProps]: TProps[key] extends (...args: any[]) => any
    ? TProps[key] extends (
        ...args: infer TArgs
      ) => (model: Model) => infer TResult
      ? (...args: TArgs) => TResult
      : TProps[key]
    : TProps[key];
} & ModelApi<TProps>;

type FamilyModel<T extends ModelProps = {}> = Model<T> & {
  $family(key: any): Model<T>;
};

const typeProp = "$$type";
const keyProp = "$key";
const dataProp = "$data";
const modelProp = "$model";
const propsProp = "$props";

interface ModelProps {
  /**
   * this method will called when model has first access
   */
  onInit?(): void;
  /**
   * this method will be called when model is ready
   */
  onCreate?(): void;

  onChange?(): void;
  /**
   * this method will be callled when listener is registered
   */
  onSubscribe?(): void;
  /**
   * this method will be callled when listener is unregistered
   */
  onUbsubscribe?(): void;
  [key: string]: any;
}

interface BaseOf<TProps extends ModelProps> {
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

interface ModelApi<TProps extends ModelProps = {}> {
  [keyProp]: any;
  [modelProp](): Model<TProps>;
  [dataProp](): Data<TProps>;
  [propsProp]: TProps;

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
  $extend<TNewModel extends ModelProps>(
    builder: (base: BaseOf<TProps>) => TNewModel
  ): Model<TNewModel>;

  /**
   * extend current model. This overload is usually for Javascript version
   * or the child model does not contain any prop/method accessing to base model
   * @param props
   */
  $extend<TNewModel extends ModelProps>(props: TNewModel): Model<TNewModel>;

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
  $listen(prop: keyof TProps, listener: VoidFunction): VoidFunction;

  /**
   * Register listener to listen model props changed event.
   * The listener will be called when some of specified props are changged
   * @param props
   * @param listener
   */
  $listen(props: (keyof TProps)[], listener: VoidFunction): VoidFunction;

  /**
   * The callback will be called when selected value which is returned from the selector is changed.
   * @param selector
   * @param callback
   * @param compareFn
   */
  $watch<TResult>(
    selector: (model: TProps) => TResult,
    callback: (result: TResult) => void,
    compareFn?: (a: TResult, b: TResult) => boolean
  ): VoidFunction;

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

  toJSON(): TProps;
}

interface InternalModelApi<TProps extends ModelProps = {}>
  extends ModelApi<TProps> {
  [typeProp]: any;
}

interface CreateOptions {
  key?: any;
  family?: boolean | Comparer;
}

interface Create {
  <
    TProps extends ModelProps,
    TBase extends Record<string, Model>,
    TOptions extends CreateOptions
  >(
    base: TBase,
    builder: (base: {
      [key in keyof TBase]: TBase[key] extends Model<infer T>
        ? BaseOf<T>
        : never;
    }) => TProps,
    options?: TOptions
  ): TOptions extends { family: true | Comparer }
    ? FamilyModel<TProps>
    : Model<TProps>;

  <TProps extends ModelProps, TOptions extends CreateOptions>(
    props: TProps,
    options?: TOptions
  ): TOptions extends { family: true | Comparer }
    ? FamilyModel<TProps>
    : Model<TProps>;
}

interface UseModel {
  <TProps extends ModelProps>(
    creator: (create: Create) => TProps,
    options?: UseModelOptions<TProps>
  ): Model<TProps>;

  /**
   * using creator function to update model whenever the component re-rendered
   */
  <TProps extends ModelProps>(
    creator: (create: Create) => TProps,
    autoUpdate: boolean
  ): Model<TProps>;

  <TProps extends ModelProps>(
    creator: (create: Create) => TProps,
    update?: (prev: TProps) => Partial<TProps>
  ): Model<TProps>;

  <TProps>(
    model: Model<TProps>,
    options?: Omit<UseModelOptions<TProps>, "updater">
  ): void;

  (models: Model[], options?: Omit<UseModelOptions<any>, "updater">): void;

  <T, TResult>(
    model: T,
    selector: T extends Model<infer TProps>
      ? (props: PropsOnly<TProps>) => TResult
      : T extends Record<string, any>
      ? (allProps: {
          [key in keyof T]: T[key] extends Model<infer TProps> ? TProps : never;
        }) => TResult
      : never,
    compareFn?: Comparer
  ): TResult;

  <TProps extends ModelProps>(
    props: TProps,
    options?: CreateOptions
  ): Model<TProps>;

  <TProps extends ModelProps>(
    props: TProps,
    update: (prev: TProps) => Partial<TProps>,
    options?: CreateOptions
  ): Model<TProps>;
}

interface UseModelOptions<TProps extends ModelProps = {}> {
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
const create: Create = (...args: any[]): any => {
  let model: Model<ModelProps>;
  let options: CreateOptions | undefined;
  let props: ModelProps;

  if (isModel(args[0])) return args[0];
  // builder
  if (typeof args[1] === "function") {
    const bases: Record<string, Function> = {};
    const builder = args[1] as Function;
    Object.entries(args[0] as Record<string, Model<any>>).forEach(
      ([key, { $props }]) => {
        bases[key] = (name: string, ...args: any[]) => {
          // get base props
          if (!name) {
            return $props;
          }

          if (!model) {
            throw new Error("Cannot call base method inside props builder");
          }

          const method = $props[name];
          if (typeof method !== "function") {
            throw new Error(`Invalid base method ${name}`);
          }

          return model.$call(method, ...args);
        };
      }
    );
    props = builder(bases);
    options = args[2];
  } else {
    props = args[0];
    options = args[1];
  }

  if (!props) throw new Error("Invalid model props");

  let updatingJobs = 0;
  let changeToken = {};

  let initialized = false;
  let api: InternalModelApi;
  let isCreating = true;
  const family = new Map<any, Model>();
  const observers: Observer[] = [];
  const listeners: Function[] = [];
  const wrappers: Wrapper[] = [];
  const notifyChange = () => {
    if (model.onChange) {
      call(model.onChange);
    }
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
        model[key].$merge(value);
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
    [propsProp]: props,
    get [keyProp]() {
      return options?.key;
    },
    [dataProp]: () => data,
    toJSON: () => data,
    get [modelProp](): any {
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
    $extend(newProps?: any): any {
      if (!newProps) return create(props);

      if (typeof newProps === "function") {
        return create({ base: model }, (bases) => newProps(bases.base));
      }
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
    $merge(props: any, lazy?: boolean) {
      call(assign, [props], !!lazy);
    },
  };

  if (options?.family) {
    const compareFn =
      typeof options.family === "function" ? options.family : keyCompare;

    (api as any).$family = (key: any) => {
      let member: typeof model | undefined;
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
          init();
          emit("write", { prop: key, value });
          if (value === data[key]) return;
          data[key] = value;
          changeToken = {};
          if (updatingJobs) return;
          notifyChange();
        },
      });
    }

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
  const modelRef = React.useRef<Model>();
  const rerender = React.useState<any>()[1];
  const optionsRef = React.useRef<UseModelOptions>({});
  const selectorRef = React.useRef<Function>();
  const compareFnRef = React.useRef<Function>();
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
          selectorRef.current = () => selector(model.$data());
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
            const allProps: Record<string, any> = {};
            Object.keys(modelMap).forEach((key) => {
              allProps[key] = modelMap[key].$data();
            });
            return selector(allProps);
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
      if (renderingRef.current) return;
      optionsRef.current.onChange?.(model);

      // has selector
      if (selectorRef.current) {
        const nextValue = selectorRef.current(...models.map((x) => x.$data()));
        const compareFn = compareFnRef.current ?? strictCompare;
        // nothing change
        if (compareFn(prevValue, nextValue)) return;
        prevValue = nextValue;
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

  if (selectorRef.current) {
    return selectorRef.current(...models.map((x) => x.$data()));
  }

  return models[0];
};

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

export {
  Model,
  ModelApi,
  UseModel,
  Wrapper,
  CreateOptions,
  Create,
  UseModelOptions,
  ModelProps,
  isModel,
  useModel,
  create,
  inject,
  shallowCompare,
  strictCompare,
};
