export function wait(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay))
}

export async function retry<T>(promiseFn: () => Promise<T>, retryCount: number = -1, delayMs = 5000) {
  try {
    return await promiseFn();
  } catch (e) {
    if (retryCount === 0) {
      throw e;
    } else {
      const newRetryCount = retryCount === -1 ? retryCount : retryCount - 1;
      return await retry(promiseFn, newRetryCount, delayMs);
    }
  }
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

export async function timeout<T>(promiseFn: () => Promise<T>, timeout: number, errorMessage = 'Promise timeout'): Promise<T> {
  const result = await Promise.race([
    promiseFn(),
    (async () => {
      await wait(timeout);
      throw new Error(errorMessage);
    })()
  ]);

  return result;
}
