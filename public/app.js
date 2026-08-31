const KEY = 'quoteloop:v1';
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const seed = [
  { id: crypto.randomUUID(), customer: 'Hall & stairs', trade: 'Painting', value: 1850, quotedAt: addDays(-5), nextFollowUp: today(), channel: 'WhatsApp', status: 'open', notes: 'Ask if they want the second colour option.', phone: '' },
  { id: crypto.randomUUID(), customer: 'Bathroom refit', trade: 'Plumbing', value: 4600, quotedAt: addDays(-11), nextFollowUp: addDays(-1), channel: 'Phone', status: 'open', notes: 'Customer was comparing two quotes.', phone: '' },
  { id: crypto.randomUUID(), customer: 'Consumer unit', trade: 'Electrical', value: 920, quotedAt: addDays(-2), nextFollowUp: today(), channel: 'Email', status: 'open', notes: 'Confirm preferred installation date.', phone: '' }
];
let quotes = JSON.parse(localStorage.getItem(KEY) || 'null');
if (!Array.isArray(quotes)) { quotes = seed; save(); }
let filter = 'today';
function save() { localStorage.setItem(KEY, JSON.stringify(quotes)); }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function dueLabel(q) {
  if (q.nextFollowUp < today()) return `Overdue · ${q.nextFollowUp}`;
  if (q.nextFollowUp === today()) return 'Due today';
  return `Due · ${q.nextFollowUp}`;
}
function dueClass(q) { return q.nextFollowUp <= today() && q.status === 'open' ? 'today' : ''; }
function message(q) {
  return `Hi — just checking whether you had any questions about the ${q.trade.toLowerCase()} quote for ${q.customer}. Happy to clarify anything or adjust the scope if helpful. No pressure either way. Thanks!`;
}
function visible() {
  return quotes.filter(q => filter === 'all' || (filter === 'open' && q.status === 'open') || (filter === 'today' && q.status === 'open' && q.nextFollowUp <= today())).sort((a,b) => a.nextFollowUp.localeCompare(b.nextFollowUp));
}
function render() {
  const list = document.querySelector('#quote-list');
  const open = quotes.filter(q => q.status === 'open');
  const due = open.filter(q => q.nextFollowUp <= today());
  document.querySelector('#summary').textContent = `${open.length} open · ${due.length} due now · ${new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(open.reduce((n,q)=>n+Number(q.value),0))} open value`;
  const rows = visible();
  list.innerHTML = rows.length ? rows.map(q => `<article class="quote-card ${dueClass(q)}"><h3>${escapeHtml(q.customer)}</h3><div class="quote-meta">${escapeHtml(q.trade)} · £${Number(q.value).toLocaleString('en-GB')} · quoted ${escapeHtml(q.quotedAt)}</div><div class="quote-foot"><span class="due-badge">${escapeHtml(dueLabel(q))}</span><span class="tag">${escapeHtml(q.channel)}${q.status !== 'open' ? ` · ${escapeHtml(q.status)}` : ''}</span></div>${q.notes ? `<p class="quote-meta" style="margin:10px 0 0">${escapeHtml(q.notes)}</p>` : ''}<div class="small-actions" style="margin-top:12px"><button class="small-button" data-action="copy" data-id="${q.id}">Copy script</button>${q.channel === 'WhatsApp' && q.phone ? `<a class="small-button" target="_blank" rel="noopener" href="https://wa.me/${encodeURIComponent(q.phone.replace(/[^\d]/g,''))}?text=${encodeURIComponent(message(q))}">Open WhatsApp</a>` : ''}<button class="small-button" data-action="won" data-id="${q.id}">Mark won</button><button class="small-button" data-action="lost" data-id="${q.id}">Close</button><button class="small-button" data-action="delete" data-id="${q.id}">Delete</button></div></article>`).join('') : '<p class="empty">Nothing in this view. Add a quote or switch to All.</p>';
}
function announce(text, good = true) { const el = document.querySelector('#quote-status'); el.className = `form-status ${good ? 'success' : 'error'}`; el.textContent = text; setTimeout(() => { el.textContent = ''; }, 3500); }
const form = document.querySelector('#quote-form');
form.querySelector('[name=quotedAt]').value = today();
form.querySelector('[name=nextFollowUp]').value = today();
form.addEventListener('submit', (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(form).entries()); data.id = crypto.randomUUID(); data.value = Number(data.value); data.status = 'open'; quotes.push(data); save(); render(); form.reset(); form.querySelector('[name=quotedAt]').value = today(); form.querySelector('[name=nextFollowUp]').value = today(); announce('Added — the quote is now on your follow-up list.'); });
document.querySelector('#quote-list').addEventListener('click', async (e) => { const b = e.target.closest('[data-action]'); if (!b) return; const q = quotes.find(x => x.id === b.dataset.id); if (!q) return; const action = b.dataset.action; if (action === 'copy') { try { await navigator.clipboard.writeText(message(q)); announce('Script copied — edit it before sending.'); } catch { announce(message(q)); } } else if (action === 'delete') { quotes = quotes.filter(x => x.id !== q.id); save(); render(); } else { q.status = action === 'won' ? 'won' : 'lost'; save(); render(); announce(`Marked ${q.status}.`); } });
document.querySelectorAll('.filter').forEach(b => b.addEventListener('click', () => { filter = b.dataset.filter; document.querySelectorAll('.filter').forEach(x => x.classList.toggle('active', x === b)); render(); }));
document.querySelector('#export-btn').addEventListener('click', () => { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), quotes }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `quoteloop-backup-${today()}.json`; a.click(); URL.revokeObjectURL(a.href); fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'app_export',path:location.pathname})}).catch(()=>{}); });
document.querySelector('#import-btn').addEventListener('click', () => document.querySelector('#import-file').click());
document.querySelector('#import-file').addEventListener('change', async (e) => { const file = e.target.files[0]; if (!file) return; try { const data = JSON.parse(await file.text()); const incoming = Array.isArray(data) ? data : data.quotes; if (!Array.isArray(incoming)) throw new Error('No quote list found'); quotes = incoming; save(); render(); announce(`Imported ${quotes.length} quotes.`); } catch (err) { announce(err.message, false); } e.target.value = ''; });
fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'app_open',path:location.pathname})}).catch(()=>{});
render();
