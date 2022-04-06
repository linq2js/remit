import produce from "immer";

function immerWrapper(next: Function, model: any) {
  return (...args: any[]) => {
    let result: any;
    // retrive changes
    const changes: any = produce(model, (draft: any) => {
      result = next.apply(draft, args);
    });
    // update value only
    Object.keys(changes ?? {}).forEach((key) => {
      if (key === "$$type") return;
      const value = changes[key];
      if (typeof value === "function") {
        return;
      }
      model[key] = value;
    });
    return result;
  };
}

export { immerWrapper };
