export function buildUnexecutableFilterError(warnings: string[] = []): Error {
  const detail = warnings.filter(Boolean).join(' ');

  return new Error(
    detail
      ? `Structured filter cannot be executed in frontend mode. ${detail}`
      : 'Structured filter cannot be executed in frontend mode.'
  );
}
