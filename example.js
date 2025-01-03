import fs from "node:fs";
const wasmBytes = fs.readFileSync("build/toto.wasm");
const module = await WebAssembly.instantiate(wasmBytes, {
  env: {
    printf: (ptr) => console.log(getCStr(ptr)),
  },
});
const memory = new Uint8Array(module.instance.exports.memory.buffer);
function getCStr(ptr) {
  let end = ptr;
  while (memory[end]) {
    end++;
  }
  return new TextDecoder().decode(memory.slice(ptr, end));
}
console.log("result", module.instance.exports.main());
