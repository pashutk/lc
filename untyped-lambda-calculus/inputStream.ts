import { pipe } from "fp-ts/lib/pipeable";
import * as S from "fp-ts/State";

export type ISState = {
  input: string;
  pos: number;
  line: number;
  col: number;
};

type Char = string;

type ISS<Result> = S.State<ISState, Result>;

// Default constructor for initial state
export const create = (input: string): ISState => ({
  input,
  pos: 0,
  line: 1,
  col: 0,
});

// Read next char
export const next: ISS<Char> = ({ input, pos, line, col }) => {
  const ch = input.charAt(pos);
  const isNewLine = ch === "\n";
  return [
    ch,
    {
      input,
      pos: pos + 1,
      line: isNewLine ? line + 1 : line,
      col: isNewLine ? 0 : col + 1,
    },
  ];
};

// Look at current char
export const peek: ISS<Char> = S.gets(({ input, pos }) => input.charAt(pos));

// Is end of input?
export const eof: ISS<boolean> = pipe(
  peek,
  S.map((ch) => ch === ""),
);

export const croak = (msg: string): ISS<never> =>
  S.gets(({ line, col }) => {
    throw new Error(`${msg} (${line}:${col})`);
  });
