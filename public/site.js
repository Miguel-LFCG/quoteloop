const postEvent = (kind, extra = {}) => {
  const payload = JSON.stringify({ kind, path: location.pathname, referrer: document.referrer, ...extra });
  if (navigator.sendBeacon) navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }));
  else fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
};

function pounds(value) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value); }
const calcForm = document.querySelector('#calculator-form');
if (calcForm) {
  const result = document.querySelector('#calc-result strong');
  const run = () => {
    const f = new FormData(calcForm);
    const count = Math.max(0, Number(f.get('quoteCount')) || 0);
    const avg = Math.max(0, Number(f.get('avgValue')) || 0);
    const current = Math.min(100, Math.max(0, Number(f.get('currentRate')) || 0));
    const target = Math.min(100, Math.max(0, Number(f.get('targetRate')) || 0));
    result.textContent = pounds(count * avg * Math.max(0, target - current) / 100);
    postEvent('calculator_run');
  };
  calcForm.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  run();
}
const leadForm = document.querySelector('#lead-form');
if (leadForm) {
  postEvent('lead_form_view');
  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.querySelector('#form-status');
    const form = new FormData(leadForm);
    const body = Object.fromEntries(form.entries());
    body.consent = form.get('consent') === 'on';
    status.className = 'form-status'; status.textContent = 'Saving your request…';
    try {
      const r = await fetch('/api/leads?source=landing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Could not save request');
      status.className = 'form-status success'; status.textContent = data.message || 'Thanks — we will be in touch.';
      leadForm.reset();
    } catch (err) { status.className = 'form-status error'; status.textContent = err.message; }
  });
}
postEvent('page_view');
