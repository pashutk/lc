import * as IS from "./inputStream";
import { Predicate, not, pipe, Refinement } from "fp-ts/function";

type Char = string;

type StringToken = {
  type: "str";
  value: string;
};

type EmptyToken = {
  type: "emp";
};

type NumberToken = {
  type: "num";
  value: number;
};

type KeywordToken = {
  type: "kw";
  value: string;
};

type VarToken = {
  type: "var";
  value: string;
};

type PuncToken = {
  type: "pnc";
  value: Char;
};

export type Operator =
  | "="
  | "||"
  | "&&"
  | "<"
  | ">"
  | "<="
  | ">="
  | "=="
  | "!="
  | "+"
  | "-"
  | "*"
  | "/"
  | "%";

type OpToken = {
  type: "op";
  value: Operator;
};

type Token = StringToken | EmptyToken | NumberToken | KeywordToken | VarToken | PuncToken | OpToken;

const empty = (): EmptyToken => ({
  type: "emp",
});

const isEmpty = (t: Token): t is EmptyToken => t.type === "emp";

export const isOp = (t: Token): t is OpToken => t.type === "op";

const isWhitespace: Predicate<Char> = (ch) => {
  switch (ch) {
    case "\t":
    case "\n":
    case " ":
      return true;
    default:
      return false;
  }
};

const isNewline: Predicate<string> = (ch) => ch === "\n";

const isStartOfComment: Predicate<Char> = (ch) => ch === "#";

const isStringBound: Predicate<Char> = (ch) => ch === '"';

const isDigit: Predicate<Char> = (ch) => /[0-9]/i.test(ch);

const isIdStart: Predicate<Char> = (ch) => /[a-zλ_]/i.test(ch);

const isId: Predicate<Char> = (ch) => isIdStart(ch) || isDigit(ch) || /\?\!\-\<\>\=/.test(ch);

const isPunc: Predicate<Char> = (ch) => ",;(){}[]".indexOf(ch) >= 0;

const isOpChar: Refinement<Char, Operator> = (ch): ch is Operator => "+-*/%=&|<>!".indexOf(ch) >= 0;

const keywords = " if then else lambda λ true false ";

const isKeyword: Predicate<string> = (s) => keywords.indexOf(" " + s + " ") >= 0;

export type TokenStream = {
  next: () => Token;
  peek: () => Token;
  eof: () => boolean;
  croak: (msg: string) => never;
};

export const TokenStream = (inputState: IS.ISState): TokenStream => {
  let current: Token = empty();
  let currentInputState = inputState;

  const applyState = <A>([a, s]: [A, IS.ISState]) => {
    currentInputState = s;
    return a;
  };
  const input = {
    eof: () => pipe(currentInputState, IS.eof, applyState),
    peek: () => pipe(currentInputState, IS.peek, applyState),
    next: () => pipe(currentInputState, IS.next, applyState),
    croak: (msg: string) => pipe(currentInputState, IS.croak(msg), applyState),
  };

  const readWhile = (predicate: Predicate<string>) => {
    let str = "";
    while (!input.eof() && predicate(input.peek())) {
      str += input.next();
    }
    return str;
  };

  const skipComment = () => {
    readWhile(not(isNewline));
    input.next();
  };

  const readEscaped = (isEnd: Predicate<Char>): string => {
    let escaped = false;
    let str = "";
    input.next();
    while (!input.eof()) {
      const ch = input.next();
      if (escaped) {
        str += ch;
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (isEnd(ch)) {
        break;
      } else {
        str += ch;
      }
    }
    return str;
  };

  const readString = (): StringToken => ({
    type: "str",
    value: readEscaped(isStringBound),
  });

  const readNumber = (): NumberToken => {
    let has_dot = false;
    const number = readWhile((ch) => {
      if (ch == ".") {
        if (has_dot) {
          return false;
        }
        has_dot = true;
        return true;
      }
      return isDigit(ch);
    });

    return { type: "num", value: parseFloat(number) };
  };

  const readIdent = (): KeywordToken | VarToken => {
    var id = readWhile(isId);
    return isKeyword(id)
      ? {
          type: "kw",
          value: id,
        }
      : {
          type: "var",
          value: id,
        };
  };

  const readNext = (): Token => {
    readWhile(isWhitespace);

    if (input.eof()) {
      return empty();
    }

    const ch = input.peek();

    if (isStartOfComment(ch)) {
      skipComment();
      return readNext();
    }

    if (isStringBound(ch)) {
      return readString();
    }

    if (isDigit(ch)) {
      return readNumber();
    }

    if (isIdStart(ch)) {
      return readIdent();
    }

    if (isPunc(ch)) {
      return {
        type: "pnc",
        value: input.next(),
      };
    }

    if (isOpChar(ch)) {
      return {
        type: "op",
        value: readWhile(isOpChar) as Operator,
      };
    }

    return input.croak("Can't handle character: " + ch);
  };

  const peek = () => {
    if (isEmpty(current)) {
      current = readNext();
    }

    return current;
  };

  return {
    next() {
      const token = current;
      current = empty();
      return isEmpty(token) ? readNext() : token;
    },

    peek,

    eof() {
      return isEmpty(peek());
    },

    croak: input.croak,
  };
};
