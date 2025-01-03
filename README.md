# llvm_test

## Installation instruction
Follow the [llvm-bindings instructions](https://github.com/ApsarasX/llvm-bindings?tab=readme-ov-file#install) to install llvm on your computer

> If llvm@14 is not installed in your path, specify in a .npmrc file a variable named `cmake_LLVM_DIR` the location of llvm (or in an environment variable)
> You may be required to install globaly cmake-js (npm i -g cmake-js) and cmake
> To compile any program, you need clang and binaryen installed on your computer

To install dependencies:

```bash
bun install
```

To run:

```bash
bun index.ts
```

This project was created using `bun init` in bun v1.1.34. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
