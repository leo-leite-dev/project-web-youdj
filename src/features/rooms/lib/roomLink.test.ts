import { describe, expect, it } from 'vitest'
import { buildRoomLink } from './roomLink'

describe('buildRoomLink', () => {
  it('builds the shareable room link from origin and code', () => {
    expect(buildRoomLink('AB12CD34EF', 'https://project-web-youdj.pages.dev')).toBe(
      'https://project-web-youdj.pages.dev/sala/AB12CD34EF',
    )
  })

  it('tolerates origins with trailing slashes', () => {
    expect(buildRoomLink('AB12CD34EF', 'http://localhost:3000/')).toBe(
      'http://localhost:3000/sala/AB12CD34EF',
    )
    expect(buildRoomLink('AB12CD34EF', 'http://localhost:3000///')).toBe(
      'http://localhost:3000/sala/AB12CD34EF',
    )
  })
})
