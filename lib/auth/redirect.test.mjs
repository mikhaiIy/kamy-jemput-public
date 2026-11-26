import assert from 'node:assert/strict'
import test from 'node:test'
import { safeRedirectPath, signInDestination } from './redirect.ts'
test('sign-in defaults respect roles while explicit customer pages remain reachable', () => {
  assert.equal(signInDestination('admin'), '/admin')
  assert.equal(signInDestination('customer'), '/dashboard')
  assert.equal(signInDestination(null), '/dashboard')
  assert.equal(signInDestination('admin', '/dashboard'), '/dashboard')
  assert.equal(signInDestination('admin', '/admin/payments?q=abc'), '/admin/payments?q=abc')
})
test('external, malformed and authentication-loop destinations cannot redirect a login', () => {
  for (const value of ['https://evil.test','//evil.test','/\\evil.test','/%5cevil.test','/%2f%2fevil.test','javascript:alert(1)','/\nevil','/%00evil','/bad%zz','/login?redirectTo=/admin','/auth/callback']) {
    assert.equal(safeRedirectPath(value), null, value)
    assert.equal(signInDestination('admin', value), '/admin', value)
  }
})
