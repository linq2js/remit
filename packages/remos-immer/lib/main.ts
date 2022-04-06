import produce from "immer";
import { Model, ModelApi } from "remos";

interface WithImmerOptions {
  ignore?: string | RegExp | ((method: Function, model: Model) => boolean);
}

function withImmer(options?: WithImmerOptions) {
  const { ignore } = options ?? {};
  const ignoreFn = !ignore
    ? undefined
    : typeof ignore === "function"
    ? ignore
    : ignore instanceof RegExp
    ? (next: any) => ignore.test(next.name || next.displayName)
    : (next: any) => (next.name || next.displayName) === ignore;
  return (api: ModelApi) =>
    api.$wrap((method: Function, model: Model) =>
      ignoreFn?.(method, model)
        ? method
        : Object.assign(
            (...args: any[]) => {
              let result: any;
              // retrive changes
              const changes: any = produce(model, (draft: any) => {
                result = method.apply(draft, args);
              });
              model.$assign(changes);
              return result;
            },
            {
              displayName: method.name || (method as any).displayName,
            }
          )
    );
}

// function producable<T = any>(fn: Function) {
//   return function (this: T, ...args: any[]) {
//     let result: any;
//     const changes = produce(this, (draft: any) => {
//       result = fn(draft, ...args);
//     });
//     // assume that 'this' is model
//     (this as any).$assign?.(changes);
//     return result;
//   };
// }

export { withImmer };
