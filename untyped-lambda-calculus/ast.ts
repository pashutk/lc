// num { type: "num", value: NUMBER }
// str { type: "str", value: STRING }
// bool { type: "bool", value: true or false }
// var { type: "var", value: NAME }
// lambda { type: "lambda", vars: [ NAME... ], body: AST }
// call { type: "call", func: AST, args: [ AST... ] }
// if { type: "if", cond: AST, then: AST, else: AST }
// assign { type: "assign", operator: "=", left: AST, right: AST }
// binary { type: "binary", operator: OPERATOR, left: AST, right: AST }
// prog { type: "prog", prog: [ AST... ] }
// let { type: "let", vars: [ VARS... ], body: AST }

import { Operator } from "./tokenStream";

export type NodeNum = { type: "num"; value: number };

export type NodeStr = { type: "str"; value: string };

export type NodeBool = { type: "bool"; value: boolean };

export type VarName = string;

export type NodeVar = { type: "var"; value: VarName };

export type NodeLambda = { type: "lambda"; vars: VarName[]; body: AST };

export type NodeCall = { type: "call"; func: AST; args: AST[] };

export type NodeIf = { type: "if"; cond: AST; then: AST; else?: AST };

export type NodeAssign = { type: "assign"; operator: "="; left: AST; right: AST };

export type NodeBinary = {
  type: "binary";
  operator: Exclude<Operator, "=">;
  left: AST;
  right: AST;
};

export type NodeProg = { type: "prog"; prog: AST[] };

// export type NodeLet = { type: "let", vars: [ VARS... ], body: AST };

export type AST =
  | NodeNum
  | NodeStr
  | NodeBool
  | NodeVar
  | NodeLambda
  | NodeCall
  | NodeIf
  | NodeAssign
  | NodeBinary
  | NodeProg;
// | NodeLet;
