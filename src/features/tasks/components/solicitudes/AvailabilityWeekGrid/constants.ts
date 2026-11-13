// Sample `HH:mm` clock times the grid's suites build their ranges from: one name per time, so
// two suites that place a block at nine never spell the value twice.

export const EIGHT_AM = '08:00'

export const NINE_AM = '09:00'

export const NINE_THIRTY_AM = '09:30'

export const TEN_AM = '10:00'

export const ELEVEN_AM = '11:00'

export const NOON = '12:00'

export const ONE_PM = '13:00'

export const FIVE_PM = '17:00'

/** How a block reads a nine-to-one range: start and end joined by an en dash. */
export const NINE_TO_ONE_TEXT = `${NINE_AM}–${ONE_PM}`
