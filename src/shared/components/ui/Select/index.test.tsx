import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Field from '../Field'
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

  // Placed in a Field, the label has to name it: the select takes the id the label points at.
  it('takes the id of the Field label around it', () => {
    const html = renderToStaticMarkup(
      <Field label={NAME}>
        <Select value="" placeholder={PROMPT} onChange={ignore} />
      </Field>,
    )
    const labelFor = html.match(/<label[^>]*for="([^"]+)"/)?.[1]
    expect(labelFor).toBeTruthy()
    expect(html).toContain(`<select id="${labelFor}"`)
  })

  it('hands the native attributes to the select untouched', () => {
    const html = draw()
    expect(html).toContain(`aria-label="${NAME}"`)
    expect(html).not.toContain('placeholder')
  })
})
