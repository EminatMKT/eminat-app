import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Select from './index'

const ignore = () => undefined
// A fixture, not shipped copy: callers hand Select a prompt their own locale already produced.
const PROMPT = 'Pick one'
const NAME = 'Category'
const OPTION = 'A'
const draw = (placeholder?: string) => renderToStaticMarkup(
  <Select aria-label={NAME} value="" placeholder={placeholder} onChange={ignore}>
    <option value="a">{OPTION}</option>
  </Select>,
)

describe('Select', () => {
  it('opens on a blank choice that reads as the prompt, ahead of the options', () => {
    const html = draw(PROMPT)
    expect(html).toContain(`<option value="" selected="">${PROMPT}</option>`)
    expect(html.indexOf(PROMPT)).toBeLessThan(html.indexOf('value="a"'))
  })

  // Editing a value that can never be empty: a blank choice there is a value the database rejects.
  it('adds no blank choice when there is no prompt', () => {
    expect(draw()).not.toContain('value=""')
  })

  it('hands the native attributes to the select untouched', () => {
    const html = draw()
    expect(html).toContain(`aria-label="${NAME}"`)
    expect(html).not.toContain('placeholder')
  })
})
