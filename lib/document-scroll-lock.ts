type ScrollLockState = {
  htmlOverflow: string;
  htmlOverflowY: string;
  bodyOverflow: string;
  bodyOverflowY: string;
};

let activeLocks = 0;
let savedState: ScrollLockState | null = null;

export function lockDocumentScroll() {
  if (typeof document === "undefined") return () => undefined;

  const html = document.documentElement;
  const body = document.body;
  if (activeLocks === 0) {
    savedState = {
      htmlOverflow: html.style.overflow,
      htmlOverflowY: html.style.overflowY,
      bodyOverflow: body.style.overflow,
      bodyOverflowY: body.style.overflowY,
    };
    html.style.overflow = "hidden";
    html.style.overflowY = "hidden";
    body.style.overflow = "hidden";
    body.style.overflowY = "hidden";
  }
  activeLocks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks !== 0 || !savedState) return;

    html.style.overflow = savedState.htmlOverflow;
    html.style.overflowY = savedState.htmlOverflowY;
    body.style.overflow = savedState.bodyOverflow;
    body.style.overflowY = savedState.bodyOverflowY;
    savedState = null;
  };
}
