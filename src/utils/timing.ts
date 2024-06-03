export function throttle(fn: () => void, delay = 0): () => void {
  let lastCall: number | null = null;
  let timeoutId: any = undefined;

  const triggerUpdateFn = () => {
    const now = Date.now();
    clearTimeout(timeoutId);

    if (lastCall === null || now - lastCall >= delay) {
      lastCall = now;
      return fn();
    }

    timeoutId = setTimeout(() => {
      triggerUpdateFn();
    }, delay - (now - lastCall));
  }

  return triggerUpdateFn;
}
