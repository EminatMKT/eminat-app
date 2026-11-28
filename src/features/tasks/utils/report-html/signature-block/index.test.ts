import { describe, it, expect } from 'vitest'
import signatureBlock from '.'
import { REPORT_APPROVER_NAME, REPORT_APPROVER_TITLE } from '../disclaimer/constants'
import { escapeHtml } from '@/shared/utils'

// Fixed left-column caption; signatureBlock takes only one argument, no t().
const teamMemberCaption = 'Miembro del equipo'
const firstTeamMemberName = 'Ada'
const secondTeamMemberName = 'Zoe López'
const nameWithMarkup = '<b>Ana & Co</b>'

describe('signatureBlock', () => {
  it('shows the given name on the left with its caption, and the approver on the right with its own caption', () => {
    const html = signatureBlock(firstTeamMemberName)
    const expectedFragments = [
      firstTeamMemberName, teamMemberCaption, REPORT_APPROVER_NAME, REPORT_APPROVER_TITLE,
    ]

    for (const fragment of expectedFragments) {
      expect(html).toContain(fragment)
    }
  })

  it('ported verbatim per the tracked AGENTS.md exception (see disclaimer.constants.ts): approver is fixed regardless of the team member, not yet read from the role catalog', () => {
    const html = signatureBlock(secondTeamMemberName)
    const expectedFragments = [secondTeamMemberName, REPORT_APPROVER_NAME, REPORT_APPROVER_TITLE]

    for (const fragment of expectedFragments) {
      expect(html).toContain(fragment)
    }
  })

  it('HTML-escapes the team member name internally -- callers must not pre-escape', () => {
    const html = signatureBlock(nameWithMarkup)

    expect(html).toContain(escapeHtml(nameWithMarkup))
    expect(html).not.toContain(nameWithMarkup)
  })

  it('is pure: the same input produces byte-identical output on repeated calls', () => {
    expect(signatureBlock(firstTeamMemberName)).toBe(signatureBlock(firstTeamMemberName))
  })

  it('keeps the two signature columns structurally distinct: left before right, not interleaved', () => {
    const html = signatureBlock(firstTeamMemberName)
    const orderedMarkers = [
      firstTeamMemberName, teamMemberCaption, REPORT_APPROVER_NAME, REPORT_APPROVER_TITLE,
    ]
    let previousIndex = -1

    for (const marker of orderedMarkers) {
      expect(html.indexOf(marker)).toBeGreaterThan(previousIndex)
      previousIndex = html.indexOf(marker)
    }
  })
})
