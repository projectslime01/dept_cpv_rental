// src/lib/__tests__/password.test.ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('test1234')
    expect(hash).toMatch(/^\$2[ab]\$/)
    expect(hash).not.toBe('test1234')
  })

  it('produces different hashes for the same input', async () => {
    const h1 = await hashPassword('test1234')
    const h2 = await hashPassword('test1234')
    expect(h1).not.toBe(h2)
  })
})

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('correct')
    expect(await verifyPassword('correct', hash)).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
