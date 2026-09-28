/** Which of a day's entries its fixed cell draws: all of them when they fit in `rows` or the day
 *  is `open`, otherwise one fewer than the rows and a count of the rest. `folds` says whether
 *  the day needs the control that opens and closes it. */
export default function dayOverflow<T>(entries: readonly T[], rows: number, open: boolean) {
  const folds = entries.length > rows
  const shown = folds && !open ? entries.slice(0, rows - 1) : entries
  return { shown, hidden: entries.length - shown.length, folds }
}

// The arithmetic of a full day, alone so it can be tested without a browser. The cell has a fixed
// height, so what it can draw is a number of rows and not a number of pixels; a day with more
// entries than rows gives up its last row to a «+N more» that opens the day in place.
//
// The count takes a row and not a corner because it is a control: it has to be as easy to hit as
// an entry. Open, the day draws everything inside the same cell, which scrolls — the cell and the
// week around it never grow.
