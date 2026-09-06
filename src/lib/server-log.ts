export function describeError(err: unknown) {
  if (err instanceof Error) {
    const extra =
      "code" in err && typeof (err as { code?: unknown }).code === "string"
        ? ` [${(err as { code: string }).code}]`
        : "";
    return `${err.name}: ${err.message}${extra}`;
  }
  return String(err);
}

export function logServerError(scope: string, err: unknown) {
  const detail = describeError(err);
  console.error(`[mawin] ${scope} → ${detail}`);
  if (err instanceof Error && err.stack) console.error(err.stack);
  return detail;
}

export function publicError(scope: string, err: unknown, hint: string) {
  const detail = logServerError(scope, err);
  return new Error(`${hint} (${detail})`);
}
