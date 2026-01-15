export function fixMojibake(
  input: string | null | undefined
): string | null | undefined {
  if (input === null || input === undefined) return input;

  // Если уже есть кириллица — ничего не делаем
  if (/[\u0400-\u04FF]/.test(input)) return input;

  // Частая сигнатура mojibake — символы 'Ð' или 'Ã' в результате двойной кодировки
  if (!/[ÐÃ]/.test(input)) return input;

  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - escape/decodeURIComponent браузерные API
    return decodeURIComponent(escape(input));
  } catch (e) {
    return input;
  }
}
