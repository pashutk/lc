import * as IS from "./inputStream";
import { TokenStream } from "./tokenStream";
import { parse } from "./parser";
import { pipe } from "fp-ts/lib/pipeable";
import { Env, evaluate } from "./interpreter";

const program = `# this is a comment

println("Hello World!");

println(2 + 3 * 4);

# functions are introduced with \`lambda\` or \`λ\`
fib = lambda (n) if n < 2 then n else fib(n - 1) + fib(n - 2);

println(fib(15));

printRange = λ(a, b)             # \`λ\` is synonym to \`lambda\`
                if a <= b then {  # \`then\` here is optional as you can see below
                  print(a);
                  if a + 1 <= b {
                    print(", ");
                    printRange(a + 1, b);
                  } else println("");        # newline
                };
printRange(1, 5);`;

const program1 = `sum = lambda(a, b) {
  a + b;
};
print(sum(1, 10));`;

const program2 = `sum = lambda(x, y) x + y; print(sum(2, 3));`;

const prog = pipe(program, IS.create, TokenStream, parse);

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
