export const normalizeSearchText = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const filterSearchOption = (value: string, search: string, keywords?: string[]): number =>
  normalizeSearchText([value, ...(keywords || [])].join(' ')).includes(normalizeSearchText(search)) ? 1 : 0;
