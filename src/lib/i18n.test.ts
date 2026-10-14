import { afterEach, describe, expect, it } from 'vitest'
import { TYPE_NAVN } from '../core/format'
import { locale, tr, useSprak } from './i18n'

afterEach(() => useSprak.getState().settSprak('no'))

describe('språk', () => {
  it('norsk er standard og ukjente tekster vises uendret', () => {
    expect(tr('Turneringer')).toBe('Turneringer')
    useSprak.getState().settSprak('en')
    expect(tr('Turneringer')).toBe('Tournaments')
    expect(tr('Et navn som ikke er oversatt')).toBe('Et navn som ikke er oversatt')
  })

  it('bytter ut variabler og oversetter oppslagsobjekter', () => {
    useSprak.getState().settSprak('en')
    expect(tr('{0} påmeldt av {1}.', 3, 8)).toBe('3 signed up of 8.')
    expect(TYPE_NAVN.CUP).toBe('Knockout')
    expect(locale()).toBe('en-GB')
    useSprak.getState().settSprak('no')
    expect(TYPE_NAVN.CUP).toBe('Cup')
    expect(tr('{0} påmeldt av {1}.', 3, 8)).toBe('3 påmeldt av 8.')
  })
})
