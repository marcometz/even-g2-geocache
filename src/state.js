export const SCREEN = {
  LIST: "list",
  DETAIL: "detail",
  FINDER: "finder"
};

export function nextIndex(currentIndex, listSize, delta) {
  if (listSize < 1) {
    return 0;
  }

  const next = currentIndex + delta;
  if (next < 0) {
    return 0;
  }

  if (next >= listSize) {
    return listSize - 1;
  }

  return next;
}
