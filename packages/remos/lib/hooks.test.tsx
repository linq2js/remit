import { renderHook, act } from "@testing-library/react-hooks";
import { create, useModel } from "./main";

test("useModel(creator)", () => {
  const useCounter = (): [number, VoidFunction] => {
    const { count, increment } = useModel({
      count: 1,
      increment() {
        this.count++;
      },
    });
    return [count, increment];
  };

  const { result, rerender } = renderHook(useCounter);

  expect(result.current[0]).toBe(1);
  rerender();
  expect(result.current[0]).toBe(1);
  act(() => {
    result.current[1]();
  });
  expect(result.current[0]).toBe(2);
});

test("useModel(accessor)", () => {
  const model = create({
    count: 1,
  });

  const useCounter = () => {
    const prop = useModel(model.$prop("count"));
    return prop.value;
  };

  const { result, rerender } = renderHook(useCounter);

  expect(result.current).toBe(1);
  rerender();
  expect(result.current).toBe(1);
  act(() => {
    model.count++;
  });
  expect(result.current).toBe(2);
});
