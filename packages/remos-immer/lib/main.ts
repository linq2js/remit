import type { Model, ModelApi } from "remos";
import produce from "immer";

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
              model.$merge(changes);
              return result;
            },
            {
              displayName: method.name || (method as any).displayName,
            }
          )
    );
}

export { withImmer };
