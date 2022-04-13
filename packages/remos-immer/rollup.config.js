import { createBasicConfig } from "@open-wc/building-rollup";

const baseConfig = createBasicConfig();

export default {
  input: "./dist/tsc/main.js",
  output: {
    dir: "dist",
    format: "cjs",
    indent: false,
  },
};
