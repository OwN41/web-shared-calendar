// Handlers for the native back button, most recently opened first.
const handlers: (() => void)[] = [];

export function pushBackHandler(fn: () => void) {
  handlers.push(fn);
  return () => {
    const i = handlers.lastIndexOf(fn);
    if (i >= 0) handlers.splice(i, 1);
  };
}

export function runBackHandler() {
  const fn = handlers[handlers.length - 1];
  fn?.();
  return Boolean(fn);
}
