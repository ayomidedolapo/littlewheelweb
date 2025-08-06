export const debounce = <Args extends unknown[]>(
  func: (...args: Args) => void,
  delayInMs: number
): ((...args: Args) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delayInMs);
  };
};
