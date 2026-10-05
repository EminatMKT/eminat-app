import { expectTypeOf, it } from 'vitest'
import type { CanonicalResponsibles, MeetResponsibleRow, NormalizedResponsibles, ResponsiblesRequest } from './types'

it('keeps the legacy principal nullable next to the full list', () => {
  expectTypeOf<CanonicalResponsibles>().toHaveProperty('responsable_id').toEqualTypeOf<string | null>()
  expectTypeOf<CanonicalResponsibles>().toHaveProperty('responsables')
})

it('accepts both request shapes and a nullable leader', () => {
  expectTypeOf<ResponsiblesRequest>().toHaveProperty('responsable_id').toEqualTypeOf<string | undefined>()
  expectTypeOf<ResponsiblesRequest>().toHaveProperty('responsable_ids').toEqualTypeOf<string[] | undefined>()
  expectTypeOf<ResponsiblesRequest>().toHaveProperty('lider_id').toEqualTypeOf<string | null | undefined>()
  expectTypeOf<NormalizedResponsibles>().toHaveProperty('leaderId').toEqualTypeOf<string | null>()
})

it('reads the user embed as one row or an array', () => {
  expectTypeOf<MeetResponsibleRow>().toHaveProperty('es_lider')
  expectTypeOf<MeetResponsibleRow>().toHaveProperty('usuarios')
})
