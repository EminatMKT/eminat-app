import { isValidElement } from 'react'
import { expect, it } from 'vitest'
import CreatePreview from '../CreatePreview'
import renderPreview from '.'

it('renders nothing while no create gesture is in progress', () => {
  expect(renderPreview(null)).toBeNull()
})

it('renders a CreatePreview at the live bounds once a create gesture is in progress', () => {
  const bounds = { start: 60, end: 90 }
  const element = renderPreview(bounds)

  expect(isValidElement(element)).toBe(true)
  expect(element?.type).toBe(CreatePreview)
  expect(element?.props.bounds).toEqual(bounds)
})
