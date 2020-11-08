type NodeNum = { type: "num"; value: number };

type NodeStr = { type: "str"; value: string };

type NodeBool = { type: "bool"; value: boolean };

// type NodeVar = { type: "var", value: NAME };

type VarName = string;

export type NodeLambda = { type: "lambda", vars: VarName[], body: AST };

// type NodeCall = { type: "call", func: AST, args: [ AST... ] };

// type NodeIf = { type: "if", cond: AST, then: AST, else: AST };

// type NodeAssign = { type: "assign", operator: "=", left: AST, right: AST };

// type NodeBinary = { type: "binary", operator: OPERATOR, left: AST, right: AST };

type NodeProg = { type: "prog", prog: [ AST... ] };

// type NodeLet = { type: "let", vars: [ VARS... ], body: AST };

export type AST = NodeProg;
