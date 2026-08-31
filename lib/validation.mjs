const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const TRADES = new Set([
  'Builder', 'Carpenter', 'Electrician', 'Gardener', 'Heating engineer',
  'Landscaper', 'Painter & decorator', 'Pest controller', 'Plumber',
  'Property maintenance', 'Roofer', 'Other'
]);

export function clean(value, max = 300) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}

export function validateLead(body = {}) {
  if (clean(body.website, 100)) return { ok: false, error: 'spam' };
  const name = clean(body.name, 100);
  const trade = clean(body.trade, 80);
  const email = clean(body.email, 160).toLowerCase();
  const note = clean(body.note, 1000);
  if (name.length < 2) return { ok: false, error: 'Please enter your name.' };
  if (!TRADES.has(trade)) return { ok: false, error: 'Please choose a valid trade.' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Please enter a valid email.' };
  if (body.consent !== true) return { ok: false, error: 'Please consent to being contacted about the pilot.' };
  return { ok: true, value: { name, trade, email, note } };
}

export function validateQuote(body = {}) {
  const customer = clean(body.customer, 120);
  const trade = clean(body.trade, 80);
  const value = Number(body.value);
  const quotedAt = clean(body.quotedAt, 10);
  const nextFollowUp = clean(body.nextFollowUp, 10);
  const channel = ['WhatsApp', 'Phone', 'Email'].includes(body.channel) ? body.channel : 'Phone';
  const status = ['open', 'won', 'lost', 'paused'].includes(body.status) ? body.status : 'open';
  if (!customer || !trade || !Number.isFinite(value) || value < 0) return { ok: false, error: 'Customer, trade and a non-negative value are required.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(quotedAt) || !/^\d{4}-\d{2}-\d{2}$/.test(nextFollowUp)) return { ok: false, error: 'Dates must use YYYY-MM-DD.' };
  return { ok: true, value: { customer, trade, value: Math.round(value * 100) / 100, quotedAt, nextFollowUp, channel, status, notes: clean(body.notes, 800), phone: clean(body.phone, 40) } };
}

export { EMAIL_RE, TRADES };
