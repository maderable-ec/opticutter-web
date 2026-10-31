import { describe, expect, it } from 'vitest'
import { defaultProjectView, projectActions, viewStatuses } from './status'

// Mirrors the API's `PROJECT_TRANSITIONS` and `QUOTABLE_STATUSES`: a button drawn here for a move the
// server refuses is a click that answers with a 422.

const designer = { canWrite: true, canQuote: false }
const seller = { canWrite: false, canQuote: true }
const admin = { canWrite: true, canQuote: true }

describe('projectActions', () => {
  it('lets the designer work a project until it is quoted', () => {
    expect(projectActions('in_progress', designer)).toEqual(['open', 'archive'])
    expect(projectActions('ready', designer)).toEqual(['reopen', 'archive'])
    expect(projectActions('archived', designer)).toEqual(['reopen'])
    expect(projectActions('quoted', designer)).toEqual([])
  })

  it('lets the seller quote a ready project, and a quoted one again', () => {
    expect(projectActions('ready', seller)).toEqual(['quote'])
    expect(projectActions('quoted', seller)).toEqual(['quote'])
    expect(projectActions('in_progress', seller)).toEqual([])
    expect(projectActions('archived', seller)).toEqual([])
  })

  it('gives the admin both, the quote first', () => {
    expect(projectActions('ready', admin)).toEqual(['quote', 'reopen', 'archive'])
  })
})

describe('project views', () => {
  it('opens the designer on their desk and the seller on the queue', () => {
    expect(defaultProjectView(true)).toBe('open')
    expect(defaultProjectView(false)).toBe('ready')
  })

  it('asks the API for the statuses of the view', () => {
    expect(viewStatuses('open')).toEqual(['in_progress', 'ready'])
    expect(viewStatuses('ready')).toEqual(['ready'])
    expect(viewStatuses('all')).toBeUndefined()
    expect(viewStatuses('bogus')).toBeUndefined()
  })
})
