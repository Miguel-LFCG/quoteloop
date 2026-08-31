import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLead, validateQuote } from '../lib/validation.mjs';

test('accepts a valid pilot lead and normalizes email', () => {
  const result = validateLead({ name: 'Miguel', trade: 'Plumber', email: 'MIGUEL@EXAMPLE.COM', note: 'Need less admin', consent: true });
  assert.equal(result.ok, true);
  assert.equal(result.value.email, 'miguel@example.com');
});

test('rejects a lead without consent or valid trade', () => {
  assert.equal(validateLead({ name: 'A', trade: 'Unknown', email: 'a@example.com', consent: false }).ok, false);
});

test('silently accepts honeypot spam without a lead error', () => {
  assert.deepEqual(validateLead({ website: 'spam', name: 'bot', trade: 'Plumber', email: 'bot@example.com', consent: true }), { ok: false, error: 'spam' });
});

test('accepts and rounds a quote', () => {
  const result = validateQuote({ customer: 'Smith job', trade: 'Plumbing', value: '1234.567', quotedAt: '2026-08-31', nextFollowUp: '2026-09-02', channel: 'WhatsApp', status: 'open', notes: 'Call' });
  assert.equal(result.ok, true);
  assert.equal(result.value.value, 1234.57);
});

test('rejects malformed quote dates and negative values', () => {
  assert.equal(validateQuote({ customer: 'x', trade: 'x', value: -1, quotedAt: '31/08/2026', nextFollowUp: 'tomorrow' }).ok, false);
});
