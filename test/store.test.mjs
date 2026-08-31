import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../lib/store.mjs';

test('persists leads, events and aggregate metrics', () => {
  const store = new Store(':memory:');
  const lead = store.addLead({ name: 'Sam', trade: 'Electrician', email: 'sam@example.com', note: 'Quotes vanish in WhatsApp' });
  assert.equal(lead.id, 1);
  assert.equal(store.listLeads()[0].email, 'sam@example.com');
  store.logEvent('page_view', '/');
  store.logEvent('page_view', '/');
  store.logEvent('calculator_run', '/');
  const metrics = store.metrics();
  assert.equal(metrics.leadCount, 1);
  assert.equal(metrics.events.page_view, 2);
  assert.equal(metrics.events.calculator_run, 1);
  store.close();
});
