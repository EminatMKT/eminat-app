import { expect, it } from 'vitest'
import SHARED_COLUMNS from '../shared'
import CATALOG_COLUMNS from '.'

it('every catalogue table is identified and named from the shared groups', () => {
  for (const columns of Object.values(CATALOG_COLUMNS)) {
    expect(columns).toMatchObject({ ...SHARED_COLUMNS.identified, ...SHARED_COLUMNS.named })
  }
})
