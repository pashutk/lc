import { TokenStream, isOp as isOpToken, Operator, Keyword } from "./tokenStream";
import { AST, NodeLambda, NodeCall, VarName, NodeProg, NodeBool, NodeIf, NodeLet } from "./ast";

// https://en.wikipedia.org/wiki/Recursive_descent_parser

const FALSE = { type: "bool", value: false } as const;

const precedence = (o: Operator): number => {
  switch (o) {
    case "=":
      return 1;
    case "||":
      return 2;
    case "&&":
      return 3;
    case "<":
    case ">":
    case "<=":
    case ">=":
    case "==":
    case "!=":
      return 7;
    case "+":
    case "-":
      return 10;
    case "*":
    case "/":
    case "%":
      return 20;
  }
};

export const parse = (input: TokenStream): NodeProg => {
  const isPunc = (ch: string) => {
    const token = input.peek();
    return token.type === "pnc" && (!ch || token.value === ch) && token;
  };

  const skipPunc = (ch: string) => {
    if (isPunc(ch)) {
      input.next();
    } else {
      input.croak(`Expecting punctuation: "${ch}"`);
    }
  };

  const delimited = <A>(start: string, stop: string, separator: string, parser: () => A): A[] => {
    const result = [];
    let first = true;
    skipPunc(start);
    while (!input.eof()) {
      if (isPunc(stop)) break;
      if (first) {
        first = false;
      } else {
        skipPunc(separator);
      }
      if (isPunc(stop)) break; // the last separator can be missing
      result.push(parser());
    }
    skipPunc(stop);
    return result;
  };

  const parseVarname = (): VarName => {
    var name = input.next();
    if (name.type !== "var") {
      input.croak("Expecting variable name");
    }
    return name.value;
  };

  const parseLambda = (): NodeLambda => {
    let name: string | undefined = undefined;
    if (input.peek().type === "var") {
      const next = input.next();
      if (next.type !== "var") {
        throw new Error(`Input peek !== next`);
      }

      name = next.value;
    }

    return {
      type: "lambda",
      name,
      vars: delimited("(", ")", ",", parseVarname),
      body: parseExpression(),
    };
  };

  const parseVardef = () => {
    const name = parseVarname();
    let def = undefined;
    if (isOp("=")) {
      input.next();
      def = parseExpression();
    }
    return { name, def };
  };

  const parseLet = (): NodeLet | NodeCall => {
    skipKw("let");
    if (input.peek().type === "var") {
      const next = input.next();
      if (next.type !== "var") {
        throw new Error(`Input peek !== next`);
      }
      const name = next.value;
      const defs = delimited("(", ")", ",", parseVardef);
      return {
        type: "call",
        func: {
          type: "lambda",
          name,
          vars: defs.map((def) => def.name),
          body: parseExpression(),
        },
        args: defs.map((def) => def.def || FALSE),
      };
    }
    return {
      type: "let",
      vars: delimited("(", ")", ",", parseVardef),
      body: parseExpression(),
    };
  };

  const parseCall = (func: AST): NodeCall => ({
    type: "call",
    func: func,
    args: delimited("(", ")", ",", parseExpression),
  });

  const maybeCall = (expr: () => AST) => {
    const exprResult = expr();
    return isPunc("(") ? parseCall(exprResult) : exprResult;
  };

  const parseProg = (): typeof FALSE | AST | NodeProg => {
    const prog = delimited("{", "}", ";", parseExpression);
    if (prog.length == 0) return FALSE;
    if (prog.length == 1) return prog[0];
    return { type: "prog", prog: prog };
  };

  const isKw = (kw: string) => {
    const token = input.peek();
    return token.type === "kw" && (!kw || token.value == kw) && token;
  };

  const skipKw = (kw: Keyword): void => {
    if (isKw(kw)) {
      input.next();
    } else {
      input.croak('Expecting keyword: "' + kw + '"');
    }
  };

  const parseIf = (): NodeIf => {
    skipKw("if");
    const cond = parseExpression();
    if (!isPunc("{")) skipKw("then");
    const then = parseExpression();
    const ret: NodeIf = {
      type: "if",
      cond,
      then,
    };
    if (isKw("else")) {
      input.next();
      ret.else = parseExpression();
    }
    return ret;
  };

  const parseBool = (): NodeBool => {
    const token = input.next();
    if (token.type !== "kw") {
      return unexpected();
    }

    return {
      type: "bool",
      value: token.value == "true",
    };
  };

  const unexpected = (): never => {
    input.croak("Unexpected token: " + JSON.stringify(input.peek()));
  };

  const parseAtom = (): AST =>
    // @ts-ignore
    maybeCall(() => {
      if (isPunc("(")) {
        input.next();
        const exp = parseExpression();
        skipPunc(")");
        return exp;
      }
      if (isPunc("{")) return parseProg();
      if (isKw("let")) return parseLet();
      if (isKw("if")) return parseIf();
      if (isKw("true") || isKw("false")) return parseBool();
      if (isKw("lambda") || isKw("λ")) {
        input.next();
        return parseLambda();
      }
      const tok = input.next();
      if (tok.type == "var" || tok.type == "num" || tok.type == "str") return tok;
      unexpected();
    });

  const isOp = (op?: string) => {
    const token = input.peek();
    return isOpToken(token) && (!op || token.value == op) && token;
  };

  type Binary = {
    type: "assign" | "binary";
    operator: string;
    left: Binary;
    right: Binary;
  };

  const maybeBinary = (left: Binary, myPrecedence: number): Binary => {
    const token = isOp();
    if (token) {
      var hisPrecedence = precedence(token.value);
      if (hisPrecedence > myPrecedence) {
        input.next();
        return maybeBinary(
          {
            type: token.value === "=" ? "assign" : "binary",
            operator: token.value,
            left: left,
            // @ts-ignore
            right: maybeBinary(parseAtom(), hisPrecedence),
          },
          myPrecedence,
        );
      }
    }
    return left;
  };

  const parseExpression = () => {
    // @ts-ignore
    return maybeCall(() => maybeBinary(parseAtom(), 0));
  };

  const parseToplevel = (): NodeProg => {
    const prog = [];
    while (!input.eof()) {
      prog.push(parseExpression());
      if (!input.eof()) {
        skipPunc(";");
      }
    }
    return { type: "prog", prog: prog };
  };

  return parseToplevel();
};
