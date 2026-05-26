export function runWithConcurrency<T>(
  tasks: ReadonlyArray<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError(
      `concurrency must be a positive integer, got ${concurrency}`
    );
  }

  if (tasks.length === 0) {
    return Promise.resolve([]);
  }

  return new Promise<T[]>((resolve, reject) => {
    const results: T[] = new Array(tasks.length);
    let nextIndex = 0;
    let completed = 0;
    let aborted = false;

    const scheduleNext = (): void => {
      if (aborted) {
        return;
      }
      if (nextIndex >= tasks.length) {
        return;
      }
      const current = nextIndex;
      nextIndex += 1;
      const task = tasks[current];
      if (!task) {
        return;
      }
      Promise.resolve()
        .then(() => task())
        .then(
          (value) => {
            if (aborted) {
              return;
            }
            results[current] = value;
            completed += 1;
            if (completed === tasks.length) {
              resolve(results);
              return;
            }
            scheduleNext();
          },
          (error) => {
            if (aborted) {
              return;
            }
            aborted = true;
            reject(error);
          }
        );
    };

    const initial = Math.min(concurrency, tasks.length);
    for (let i = 0; i < initial; i += 1) {
      scheduleNext();
    }
  });
}
