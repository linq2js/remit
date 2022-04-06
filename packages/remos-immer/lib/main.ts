import produce from "immer";
import { Model } from "remos";

interface ImmerWrapperOptions {
  ignore?: string | RegExp | ((method: Function, model: Model) => boolean);
}

function immerWrapper(options?: ImmerWrapperOptions) {
  const { ignore } = options ?? {};
  const ignoreFn = !ignore
    ? undefined
    : typeof ignore === "function"
    ? ignore
    : ignore instanceof RegExp
    ? (next: any) => ignore.test(next.name || next.displayName)
    : (next: any) => (next.name || next.displayName) === ignore;
  return (next: Function, model: any) =>
    ignoreFn?.(next, model)
      ? next
      : Object.assign(
          (...args: any[]) => {
            let result: any;
            // retrive changes
            const changes: any = produce(model, (draft: any) => {
              result = next.apply(draft, args);
            });
            model.$assign(changes);
            return result;
          },
          {
            displayName: next.name || (next as any).displayName,
          }
        );
}

export { immerWrapper };
