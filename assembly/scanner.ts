let nextPtr: usize = 0;
let matchPtr: usize = 0;
let countPtr: usize = 0;
let numCounters: i32 = 0;
let state: i32 = 0;

let bump: usize = 0;

export function alloc(size: i32): usize {
  if (bump == 0) bump = __heap_base;
  const aligned: usize = (<usize>size + 15) & ~(<usize>15);
  const p = bump;
  bump += aligned;
  const haveBytes: usize = (<usize>memory.size()) << 16;
  if (bump > haveBytes) {
    const need: usize = bump - haveBytes;
    const pages = <i32>((need + 0xffff) >> 16);
    memory.grow(pages);
  }
  return p;
}

export function configure(
  nPtr: usize,
  mPtr: usize,
  cPtr: usize,
  nCount: i32,
): void {
  nextPtr = nPtr;
  matchPtr = mPtr;
  countPtr = cPtr;
  numCounters = nCount;
  state = 0;
}

export function reset(): void {
  state = 0;
  for (let i = 0; i < numCounters; i++) {
    store<i32>(countPtr + ((<usize>i) << 2), 0);
  }
}

export function scan(ptr: usize, len: i32): void {
  let s = state;
  const nt = nextPtr;
  const mt = matchPtr;
  const ct = countPtr;
  const end: usize = ptr + <usize>len;
  for (let p: usize = ptr; p < end; p++) {
    const b = <i32>load<u8>(p);
    s = load<i32>(nt + ((<usize>((s << 8) + b)) << 2));
    const m = load<i32>(mt + ((<usize>s) << 2));
    if (m >= 0) {
      const cp = ct + ((<usize>m) << 2);
      store<i32>(cp, load<i32>(cp) + 1);
    }
  }
  state = s;
}
