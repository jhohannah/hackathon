import { beforeEach, describe, expect, it } from 'vitest'
import { ADMIN_PASSORD, erAdmin, trygSti, useAuth } from './auth'

const a = () => useAuth.getState()

beforeEach(() => a().loggUt())

describe('innlogging', () => {
  it('admin trenger riktig passord', () => {
    expect(a().loggInnAdmin('feil').ok).toBe(false)
    expect(a().bruker).toBeUndefined()
    expect(a().loggInnAdmin(ADMIN_PASSORD).ok).toBe(true)
    expect(erAdmin(a().bruker)).toBe(true)
  })

  it('deltaker trenger navn og er ikke admin', () => {
    expect(a().loggInnDeltaker(' ').ok).toBe(false)
    expect(a().loggInnDeltaker('Kari', 'ikke-epost').ok).toBe(false)
    expect(a().loggInnDeltaker('  Kari Nilsen ', 'kari@nome.no').ok).toBe(true)
    expect(a().bruker).toEqual({ rolle: 'DELTAKER', navn: 'Kari Nilsen', epost: 'kari@nome.no' })
    expect(erAdmin(a().bruker)).toBe(false)
  })

  it('logg ut fjerner brukeren, og bytte fra admin til deltaker fjerner admin-rettigheter', () => {
    a().loggInnAdmin(ADMIN_PASSORD)
    a().loggInnDeltaker('Ola')
    expect(erAdmin(a().bruker)).toBe(false)
    a().loggUt()
    expect(a().bruker).toBeUndefined()
    expect(erAdmin(undefined)).toBe(false)
  })

  it('videresending godtar bare lokale stier', () => {
    expect(trygSti('/admin', '/')).toBe('/admin')
    expect(trygSti('//evil.example', '/')).toBe('/')
    expect(trygSti('https://evil.example', '/')).toBe('/')
    expect(trygSti(null, '/pamelding')).toBe('/pamelding')
  })
})
