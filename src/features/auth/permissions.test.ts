import { describe, expect, it } from 'vitest'
import { hasAnyRole, homePathForRoles, isGlobalBranchRole, toggleRole } from './permissions'

// Mirrors the backend's `has_any_role` and `UserService._normalize_roles`: if one side changes,
// these tests say which rule the other side has to follow.

describe('hasAnyRole', () => {
  it('grants the union of the roles', () => {
    expect(hasAnyRole(['operador', 'canteador'], ['canteador'])).toBe(true)
    expect(hasAnyRole(['operador', 'canteador'], ['operador'])).toBe(true)
    expect(hasAnyRole(['operador', 'canteador'], ['vendedor'])).toBe(false)
  })

  it('denies a user with no roles yet', () => {
    expect(hasAnyRole(undefined, ['administrador'])).toBe(false)
    expect(hasAnyRole([], ['administrador'])).toBe(false)
  })
})

describe('isGlobalBranchRole', () => {
  it('is true for administrador and vendedor only', () => {
    expect(isGlobalBranchRole(['administrador'])).toBe(true)
    expect(isGlobalBranchRole(['vendedor'])).toBe(true)
    expect(isGlobalBranchRole(['operador', 'canteador'])).toBe(false)
  })
})

describe('toggleRole', () => {
  it('combines the two workshop roles, in canonical order', () => {
    expect(toggleRole(['canteador'], 'operador', true)).toEqual(['operador', 'canteador'])
  })

  it('makes a global role replace everything', () => {
    expect(toggleRole(['operador', 'canteador'], 'vendedor', true)).toEqual(['vendedor'])
    expect(toggleRole(['vendedor'], 'administrador', true)).toEqual(['administrador'])
  })

  it('drops the global role a workshop role joins', () => {
    expect(toggleRole(['vendedor'], 'operador', true)).toEqual(['operador'])
  })

  it('unticks only the role given', () => {
    expect(toggleRole(['operador', 'canteador'], 'operador', false)).toEqual(['canteador'])
  })
})

describe('homePathForRoles', () => {
  it('lands each role on a route it can open', () => {
    expect(homePathForRoles(['administrador'])).toBe('/inicio')
    expect(homePathForRoles(['vendedor'])).toBe('/inicio')
    expect(homePathForRoles(['operador'])).toBe('/workshop-board')
    expect(homePathForRoles(['canteador'])).toBe('/workshop-board')
    expect(homePathForRoles(['operador', 'canteador'])).toBe('/workshop-board')
  })

  it('falls back to the profile, the one route everybody reaches', () => {
    expect(homePathForRoles(undefined)).toBe('/profile')
    expect(homePathForRoles([])).toBe('/profile')
  })
})
