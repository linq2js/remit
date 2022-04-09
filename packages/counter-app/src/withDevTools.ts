import type {} from "@redux-devtools/extension";
import { Injector } from "remos";

type Message = {
  type: string;
  payload?: any;
  state?: any;
};

type Extension = typeof window["__REDUX_DEVTOOLS_EXTENSION__"];

type DevTools = ReturnType<NonNullable<Extension>["connect"]>;

type Subscribable = {
  // FIXME https://github.com/reduxjs/redux-devtools/issues/1097
  subscribe: (listener: (message: Message) => void) => (() => void) | undefined;
};

function withDevTools(): Injector {
  let extension: typeof window["__REDUX_DEVTOOLS_EXTENSION__"];

  try {
    extension = window.__REDUX_DEVTOOLS_EXTENSION__;
  } catch {
    // ignored
  }
  if (!extension) {
    if (typeof window !== "undefined") {
      console.warn("Please install/enable Redux devtools extension");
    }
    return () => {};
  }

  const devTools: DevTools = extension.connect({ name: "remos" });
  let isRollingBack = false;
  let allModels: Record<string, any> = {};

  const unsubscribe = (devTools as unknown as Subscribable).subscribe(
    (message) => {
      console.log(message);
      if (message.type === "ACTION" && message.payload) {
        try {
          // setValueIfWritable(JSON.parse(message.payload));
        } catch (e) {
          console.error(
            "please dispatch a serializable value that JSON.parse() support\n",
            e
          );
        }
      } else if (message.type === "DISPATCH" && message.state) {
        if (
          message.payload?.type === "JUMP_TO_ACTION" ||
          message.payload?.type === "JUMP_TO_STATE"
        ) {
          isRollingBack = true;
          const unfreezes: Function[] = [];
          try {
            // update all models
            const state = JSON.parse(message.state);
            const updates: Function[] = [];
            Object.entries(allModels).forEach(
              ([key, originalValue]: [any, any]) => {
                const rollbackValue = state[key];

                // family
                if (Array.isArray(originalValue)) {
                  const rollbackItems = (rollbackValue ?? []) as any[];
                  originalValue.forEach((originalItem) => {
                    const existing = rollbackItems.find(
                      (x) => x.key === originalItem.key
                    );
                    const model = originalItem.model();
                    if (!existing) {
                      model.$remove();
                    } else {
                      unfreezes.push(model.$freeze());
                      updates.push(() => model.$merge(existing.data));
                    }
                  });
                } else {
                  if (originalValue) {
                    const model = originalValue.model();
                    unfreezes.push(model.$freeze());
                    updates.push(() => model.$merge(originalValue.data));
                  } else {
                    delete allModels[key];
                  }
                }
              }
            );
            updates.forEach((x) => x());
          } finally {
            isRollingBack = false;
            unfreezes.forEach((x) => x());
          }
        }
      } else if (
        message.type === "DISPATCH" &&
        message.payload?.type === "COMMIT"
      ) {
        // devTools.init(lastValue.current);
      } else if (
        message.type === "DISPATCH" &&
        message.payload?.type === "IMPORT_STATE"
      ) {
      }
    }
  );

  devTools.init(allModels);

  return (api, props) => {
    const name: string | undefined = props._DEVTOOLS_NAME;
    if (!name) return;

    api.$observe((type, value) => {
      if (isRollingBack) return;
      if (type === "read") return;
      const getKey: Function | undefined = (api.$model as any).$key;
      const actionType = `${name + (getKey ? "[]" : "")}:${type}${
        value
          ? ":" +
            (typeof value === "function"
              ? value.name || value.displayName
              : value)
          : ""
      }`;

      setTimeout(() => {
        if (getKey) {
          const key = getKey();
          let list: any[] = allModels[name];
          if (!list) {
            allModels[name] = list = [];
          }
          if (type === "remove") {
            allModels[name] = list.filter((x) => x.key !== key);
          } else {
            const model = list.find((x: any) => x.key === key);
            if (!model) {
              list.push({
                key,
                data: api.$data(),
                model: () => api.$model,
              });
            } else {
              model.data = api.$data();
            }
          }
        } else {
          allModels[name] = {
            data: api.$data(),
            model: () => api.$model,
          };
        }
        devTools.send(
          {
            type: actionType,
            key: getKey?.(),
          } as any,
          allModels
        );
      });
    });
  };
}

export { withDevTools };
