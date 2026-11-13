/** The current local wall-clock time: the grid's one read of the platform clock. */
export default function now(): Date {
  const reading = new Date()

  return reading
}

// The single seam for the time: tests freeze it with fake timers instead of the machine clock.
