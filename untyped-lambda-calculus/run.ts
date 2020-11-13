import { pipe } from "fp-ts/lib/pipeable";
import { create as createInputStream } from "./inputStream";
import { TokenStream } from "./tokenStream";
import { parse } from "./parser";
import { Env, evaluate } from "./interpreter";

let input = "";
process.stdin.on("data", (data) => (input += data));
process.stdin.on("end", () => {
  const prog = pipe(input, createInputStream, TokenStream, parse);

  const globalEnv = new Env();

  globalEnv.def("print", (txt) => {
    process.stdout.write(String(txt));
    return txt;
  });

  globalEnv.def("println", (txt) => {
    process.stdout.write(String(txt) + "\n");
    return txt;
  });

  evaluate(prog, globalEnv);
});
