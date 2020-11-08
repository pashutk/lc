export type InputStream = {
  next: () => string;
  peek: () => string;
  eof: () => boolean;
  croak: (msg: string) => never;
};

export const InputStream = (input: string): InputStream => {
  let pos = 0;
  let line = 1;
  let col = 0;

  const peek = () => input.charAt(pos);

  return {
    next() {
      const ch = input.charAt(pos++);

      if (ch === "\n") {
        line++;
        col = 0;
      } else {
        col++;
      }

      return ch;
    },

    peek,

    eof() {
      return peek() === "";
    },

    croak(msg: string) {
      throw new Error(`${msg} (${line}:${col})`);
    },
  };
};
