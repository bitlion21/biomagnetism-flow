export const getPairNumber = (pairCode: string): string => {
  const match = pairCode.match(/\d+/);
  return match ? match[0] : pairCode;
};

export const getPairImageLabel = (
  pairCode: string,
  point1?: string,
  point2?: string
): string => {
  const number = getPairNumber(pairCode);
  if (point1 && point2) {
    return `Imagen del par ${number} - ${point1} - ${point2}`;
  }
  return `Imagen del par ${number}`;
};

const sanitizeFilenamePart = (value: string): string =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ");

export const getPairImageFilename = (
  pairCode: string,
  point1: string,
  point2: string
): string => {
  const number = getPairNumber(pairCode);
  return `${number} - ${sanitizeFilenamePart(point1)} - ${sanitizeFilenamePart(point2)}.png`;
};
