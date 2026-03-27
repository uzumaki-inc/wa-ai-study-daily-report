export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`[${label}] ${maxRetries}回リトライ後も失敗`);
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(
        `[${label}] 失敗 (${attempt}/${maxRetries}) — ${delay}ms後にリトライ: ${error instanceof Error ? error.message : error}`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}
