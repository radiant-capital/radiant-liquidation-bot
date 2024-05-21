export function wait(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay))
}

export function debounce<T>(fn: (...args: any[]) => Promise<T>, delay = 0): () => Promise<T> {
  let timeoutId: any = null;
  let resolveList: any[] = [];
  let currentPromise: any | null = null;

  return function(...args: any[]) {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      resolveList.push(resolve);

      timeoutId = setTimeout(async () => {
        try {
          if (currentPromise) {
            await currentPromise;
          }

          currentPromise = (async () => {
            const result = await fn(...args);
            resolveList.forEach(res => res(result));
            resolveList = [];
            return result;
          })();

          await currentPromise;
          currentPromise = null;
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}
