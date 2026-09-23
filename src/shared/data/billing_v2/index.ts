export { default } from './records'

// The billing v2 data layer. One table holds payments, calendar events and month notes, so the
// repository is one module and the subtype it is handed decides which columns exist: `row`
// validates the mutation through the domain schemas and fills the rest with their absent value,
// which is what makes a record that changes shape clear the columns it stopped using.
//
// Three things never cross this boundary. The browser does not choose the currency, the creator
// or the timestamps: the first is the constant in `row`, the other three belong to the database
// trigger, and a forged value would be ignored — so sending one at all is a bug here. Reads page
// on the primary key instead of trusting one `select`, because PostgREST caps a page at a
// thousand rows and answers 200, which turns a total computed from it into a quiet lie.
