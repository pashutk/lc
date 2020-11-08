import { TokenStream } from "./tokenStream";
import { AST, NodeLambda } from "./ast";
import { Predicate } from "fp-ts/lib/function";

// https://en.wikipedia.org/wiki/Recursive_descent_parser

const FALSE = { type: "bool", value: false };

const PRECEDENCE = {
  "=": 1,
  "||": 2,
  "&&": 3,
  "<": 7,
  ">": 7,
  "<=": 7,
  ">=": 7,
  "==": 7,
  "!=": 7,
  "+": 10,
  "-": 10,
  "*": 20,
  "/": 20,
  "%": 20,
} as const;

const parse = (input: TokenStream): AST => {
  const isPunc: Predicate<string> = (ch) => {
    const token = input.peek();
    return token.type === "pnc" && (!ch || token.value === ch);
  };

  const skipPunc = (ch: string) => {
    if (isPunc(ch)) {
      input.next();
    } else {
      input.croak(`Expecting punctuation: "${ch}"`);
    }
  };

  const delimited = (start: string, stop: string, separator: string, parser: () => string) => {
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

  const parseVarname = () => {
    var name = input.next();
    if (name.type != "var") {
      input.croak("Expecting variable name");
    }
    return name.value;
  };

  const parseLambda = (): NodeLambda => ({
    type: "lambda",
    vars: delimited("(", ")", ",", parseVarname),
    body: parseExpression(),
  });

  // const maybeCall = (expr: () => unknown) => {
  //   const exprResult = expr();
  //   return isPunc("(") ? parse_call(exprResult) : exprResult;
  // };

  // const parseExpression = () => {
  //   return maybeCall(() => maybe_binary(parse_atom(), 0));
  // };

  const parseToplevel = (): AST => {
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
  // function is_kw(kw) {
  //   var tok = input.peek();
  //   return tok && tok.type == "kw" && (!kw || tok.value == kw) && tok;
  // }
  // function is_op(op) {
  //   var tok = input.peek();
  //   return tok && tok.type == "op" && (!op || tok.value == op) && tok;
  // }
  // function skip_kw(kw) {
  //   if (is_kw(kw)) input.next();
  //   else input.croak('Expecting keyword: "' + kw + '"');
  // }
  // function skip_op(op) {
  //   if (is_op(op)) input.next();
  //   else input.croak('Expecting operator: "' + op + '"');
  // }
  // function unexpected() {
  //   input.croak("Unexpected token: " + JSON.stringify(input.peek()));
  // }
  // function maybe_binary(left, my_prec) {
  //   var tok = is_op();
  //   if (tok) {
  //     var his_prec = PRECEDENCE[tok.value];
  //     if (his_prec > my_prec) {
  //       input.next();
  //       return maybe_binary(
  //         {
  //           type: tok.value == "=" ? "assign" : "binary",
  //           operator: tok.value,
  //           left: left,
  //           right: maybe_binary(parse_atom(), his_prec),
  //         },
  //         my_prec,
  //       );
  //     }
  //   }
  //   return left;
  // }
  // function parse_call(func) {
  //   return {
  //     type: "call",
  //     func: func,
  //     args: delimited("(", ")", ",", parseExpression),
  //   };
  // }

  // function parse_if() {
  //   skip_kw("if");
  //   var cond = parseExpression();
  //   if (!isPunc("{")) skip_kw("then");
  //   var then = parseExpression();
  //   var ret = {
  //     type: "if",
  //     cond: cond,
  //     then: then,
  //   };
  //   if (is_kw("else")) {
  //     input.next();
  //     ret.else = parseExpression();
  //   }
  //   return ret;
  // }
  // function parse_bool() {
  //   return {
  //     type: "bool",
  //     value: input.next().value == "true",
  //   };
  // }
  // function parse_atom() {
  //   return maybeCall(function () {
  //     if (isPunc("(")) {
  //       input.next();
  //       var exp = parseExpression();
  //       skipPunc(")");
  //       return exp;
  //     }
  //     if (isPunc("{")) return parse_prog();
  //     if (is_kw("if")) return parse_if();
  //     if (is_kw("true") || is_kw("false")) return parse_bool();
  //     if (is_kw("lambda") || is_kw("λ")) {
  //       input.next();
  //       return parse_lambda();
  //     }
  //     var tok = input.next();
  //     if (tok.type == "var" || tok.type == "num" || tok.type == "str")
  //       return tok;
  //     unexpected();
  //   });
  // }
  // function parse_prog() {
  //   var prog = delimited("{", "}", ";", parseExpression);
  //   if (prog.length == 0) return FALSE;
  //   if (prog.length == 1) return prog[0];
  //   return { type: "prog", prog: prog };
  // }
};
