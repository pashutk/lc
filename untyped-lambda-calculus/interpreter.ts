import { AST, NodeLambda } from "./ast";
import { inspect } from "util";
import { Operator } from "./tokenStream";

type Primitive = boolean | number | string | Lambda;

type Lambda = (...args: Primitive[]) => Primitive;

type Parent = Env | null;

export class Env {
  protected vars: Record<string, Primitive>;
  constructor(protected readonly parent: Parent = null) {
    this.vars = Object.create(parent ? parent.vars : null);
  }

  extend() {
    return new Env(this);
  }

  lookup(name: string) {
    let scope: Parent = this;
    while (scope) {
      if (Object.prototype.hasOwnProperty.call(scope.vars, name)) {
        return scope;
      }

      scope = scope.parent;
    }
  }

  get(name: string) {
    if (name in this.vars) {
      return this.vars[name];
    }

    throw new Error(`Undefined variable ${name}`);
  }

  set(name: string, value: Primitive) {
    const scope = this.lookup(name);

    // let's not allow defining globals from a nested environment
    if (!scope && this.parent) {
      throw new Error(`Undefined variable ${name}`);
    }

    return ((scope || this).vars[name] = value);
  }

  def(name: string, value: Primitive) {
    return (this.vars[name] = value);
  }
}

const applyOp = <A extends Primitive>(op: Operator, a: A, b: A) => {
  const num = (x: unknown) => {
    if (typeof x !== "number") {
      throw new Error(`Expected number but got ${inspect(x)}`);
    }

    return x;
  };

  const div = (x: unknown): number => {
    const n = num(x);
    if (n === 0) {
      throw new Error(`Div by zero`);
    }

    return n;
  };

  switch (op) {
    case "+":
      return num(a) + num(b);
    case "-":
      return num(a) - num(b);
    case "*":
      return num(a) * num(b);
    case "/":
      return num(a) / div(b);
    case "%":
      return num(a) % div(b);
    case "&&":
      return a !== false && b;
    case "||":
      return a !== false ? a : b;
    case "<":
      return num(a) < num(b);
    case ">":
      return num(a) > num(b);
    case "<=":
      return num(a) <= num(b);
    case ">=":
      return num(a) >= num(b);
    case "==":
      return a === b;
    case "!=":
      return a !== b;

    default:
      throw new Error(`Can't apply operator ${op}`);
  }
};

const makeLambda = (exp: NodeLambda, env: Env): Lambda => {
  return (...args: Primitive[]) => {
    const names = exp.vars;
    const scope = env.extend();
    for (let i = 0; i < names.length; i++) {
      scope.def(names[i], i < args.length ? args[i] : false);
    }
    return evaluate(exp.body, scope);
  };
};

export const evaluate = (exp: AST, env: Env): Primitive => {
  switch (exp.type) {
    case "num":
    case "str":
    case "bool":
      return exp.value;

    case "var":
      return env.get(exp.value);

    case "assign":
      if (exp.left.type !== "var") {
        throw new Error(`Cannot assign to ${inspect(exp.left)}`);
      }

      return env.set(exp.left.value, evaluate(exp.right, env));

    case "binary":
      return applyOp(exp.operator, evaluate(exp.left, env), evaluate(exp.right, env));

    case "lambda":
      return makeLambda(exp, env);

    case "if":
      const cond = evaluate(exp.cond, env);
      return cond ? evaluate(exp.then, env) : exp.else ? evaluate(exp.else, env) : false;

    case "prog":
      let val: Primitive = false;
      exp.prog.forEach((e) => {
        val = evaluate(e, env);
      });
      return val;

    case "call":
      const func = evaluate(exp.func, env);
      if (typeof func !== "function") {
        throw new Error(`Trying to call non function expression: ${inspect(exp)}`);
      }

      const as = exp.args.map((arg) => evaluate(arg, env));
      return func.apply(null, as);

    default:
      throw new Error(`Can't evaluate expression ${inspect(exp)}`);
  }
};
