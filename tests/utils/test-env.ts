export function withEnv(values: Record<string, string>, fn: () => Promise<void> | void) {
  const previous = { ...process.env };
  Object.assign(process.env, values);

  const run = async () => {
    try {
      await fn();
    } finally {
      process.env = previous;
    }
  };

  return run();
}
