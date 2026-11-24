export {};
const data = JSON.parse(document.getElementById('cmd-data')!.textContent!);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/* ---------- theme ---------- */
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
  return next;
}
$('toggle-theme').addEventListener('click', toggleTheme);


/* ---------- mobile menu ---------- */
const menuBtn = $('menu-toggle'), menu = $('mobile-menu');
const setMenu = (open: boolean) => { menu.classList.toggle('hidden', !open); menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); $('menu-icon').setAttribute('d', open ? 'M4 4l12 12M16 4L4 16' : 'M3 5h14M3 10h14M3 15h14'); };
menuBtn.addEventListener('click', () => setMenu(menu.classList.contains('hidden')));
menu.addEventListener('click', (e) => (e.target as HTMLElement).closest('a') && setMenu(false));
matchMedia('(min-width: 768px)').addEventListener('change', (m) => m.matches && setMenu(false));

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- typed tagline ---------- */
const typed = document.getElementById('typed');
if (typed) {
  const lines: string[] = JSON.parse(typed.dataset.lines || '[]');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !lines.length) {
    typed.textContent = lines[0] ?? '';
  } else {
    let li = 0, ci = 0, del = false;
    const tick = () => {
      const line = lines[li];
      typed.textContent = line.slice(0, ci);
      if (!del && ci === line.length) { del = true; return setTimeout(tick, 1600); }
      if (del && ci === 0) { del = false; li = (li + 1) % lines.length; }
      ci += del ? -1 : 1;
      setTimeout(tick, del ? 28 : 55);
    };
    tick();
  }
}

/* ---------- backend (optional) ---------- */
interface ApiStatus { status: string; version: string; runtime: string; region: string | null; time: string; requests: number | null }
interface ApiHealth { ok: boolean; region: string | null }
class ApiError extends Error {}

async function apiGet<T>(path: string): Promise<T> {
  if (!data.apiUrl) throw new ApiError('no backend configured (PUBLIC_API_URL was not set when the site was built)');
  const url = `${data.apiUrl}${path}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new ApiError(`GET ${url} returned HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`);
    try { return (await res.json()) as T; }
    catch (e) { throw new ApiError(`GET ${url} returned a response that is not valid JSON (${(e as Error).message})`); }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === 'AbortError') throw new ApiError(`GET ${url} timed out after 3s`);
    // Browsers report network failures and CORS blocks identically, so say both.
    throw new ApiError(`GET ${url} failed: ${(e as Error).message} (network error, or blocked by CORS: the browser does not say which)`);
  } finally { clearTimeout(timer); }
}
const errText = (e: unknown) => `error: ${e instanceof Error ? e.message : String(e)}`;

/* ---------- shared command registry ---------- */
interface Cmd { name: string; hint: string; showOutput?: boolean; run: () => string | void | Promise<string | void> }
const go = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
const registry: Cmd[] = [
  ...data.sections.map((s: string): Cmd => ({ name: `goto ${s}`, hint: `Jump to ${s}`, run: () => { go(s); return `→ ${s}`; } })),
  ...data.links.map((l: { label: string; href: string }): Cmd => ({ name: `open ${l.label.toLowerCase().replace(/\s+/g, '-')}`, hint: l.href, run: () => { window.open(l.href, '_blank', 'noopener'); return `opening ${l.href}`; } })),
  ...(data.items as { kind: string; name: string; hint: string; target: string }[]).map((i): Cmd => i.kind === 'open'
    ? { name: `repo ${i.name.toLowerCase()}`, hint: i.hint, run: () => { window.open(i.target, '_blank', 'noopener'); return `opening ${i.target}`; } }
    : { name: `goto ${i.name.toLowerCase()}`, hint: i.hint, run: () => { const el = document.getElementById(i.target); if (el instanceof HTMLDetailsElement) el.open = true; go(i.target); return `→ ${i.name}`; } }),
  { name: 'email', hint: data.email, run: () => { location.href = `mailto:${data.email}`; return data.email; } },
  { name: 'status', hint: 'Live backend status', showOutput: true, run: async () => {
      try {
        const a = await apiGet<ApiStatus>('/api/status');
        return [`api: ${a.status}`, `version: ${a.version}`, `runtime: ${a.runtime}`, `edge: ${a.region ?? 'unknown'}`, `requests served: ${a.requests ?? 'n/a'}`].join('\n');
      } catch (e) { return errText(e); }
    } },
  { name: 'ping', hint: 'Round-trip time to the backend', showOutput: true, run: async () => {
      try {
        const times: number[] = [];
        let region: string | null = null;
        for (let i = 0; i < 3; i++) {
          const t0 = performance.now();
          region = (await apiGet<ApiHealth>('/health')).region;
          times.push(Math.round(performance.now() - t0));
        }
        return `pong from edge ${region ?? 'unknown'}: ${times.map((t) => `${t} ms`).join(', ')} (first includes connection setup)`;
      } catch (e) { return errText(e); }
    } },
  { name: 'theme', hint: 'Toggle light/dark', run: () => `theme: ${toggleTheme()}` },
];

/* ---------- palette ---------- */
const pal = $('palette'), palIn = $<HTMLInputElement>('palette-input'), palList = $('palette-list');
let sel = 0, shown: Cmd[] = [];
function renderPalette() {
  const q = palIn.value.trim().toLowerCase();
  shown = registry.filter((c) => !q || c.name.includes(q) || c.hint.toLowerCase().includes(q));
  sel = Math.min(sel, Math.max(shown.length - 1, 0));
  palList.innerHTML = '';
  shown.forEach((c, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === sel));
    li.className = `flex cursor-pointer justify-between gap-3 px-4 py-2 ${i === sel ? 'bg-bg text-fg' : 'text-muted'}`;
    li.innerHTML = `<span class="font-mono"></span><span class="truncate text-xs"></span>`;
    (li.children[0] as HTMLElement).textContent = c.name;
    (li.children[1] as HTMLElement).textContent = c.hint;
    li.addEventListener('click', () => runFromPalette(c));
    palList.appendChild(li);
  });
  if (!shown.length) palList.innerHTML = '<li class="px-4 py-2 text-muted">No matches</li>';
}
// Commands that produce text (status, ping) show it in the terminal; the rest just act.
async function runFromPalette(c: Cmd) {
  closePalette();
  if (!c.showOutput) { c.run(); return; }
  openTerm();
  termPrint(`$ ${c.name}`, 'text-fg');
  const res = await c.run();
  if (res) termPrint(String(res), 'text-muted');
}
function openPalette() { pal.classList.replace('hidden', 'flex'); palIn.value = ''; sel = 0; renderPalette(); palIn.focus(); }
function closePalette() { pal.classList.replace('flex', 'hidden'); }
$('open-palette').addEventListener('click', openPalette);
pal.addEventListener('click', (e) => e.target === pal && closePalette());
palIn.addEventListener('input', () => { sel = 0; renderPalette(); });
palIn.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); renderPalette(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); renderPalette(); e.preventDefault(); }
  else if (e.key === 'Enter' && shown[sel]) runFromPalette(shown[sel]);
});

/* ---------- terminal ---------- */
const term = $('terminal'), out = $('term-out'), tin = $<HTMLInputElement>('term-input');
const cmdHistory: string[] = []; let hi = 0; let greeted = false;
const termPrint = (t: string, cls = '') => { const d = document.createElement('div'); d.className = `whitespace-pre-wrap ${cls}`; d.textContent = t; out.appendChild(d); out.scrollTop = out.scrollHeight; };
function openTerm() {
  term.classList.remove('hidden');
  if (!greeted) { greeted = true; termPrint(`Welcome. Type "help" to list commands.`, 'text-muted'); }
  tin.focus();
}
function closeTerm() { term.classList.add('hidden'); }
$('terminal-close').addEventListener('click', closeTerm);
const builtins: Record<string, (a: string[]) => string | void> = {
  help: () => ['about, whoami, skills, ls, clear, exit', ...registry.map((c) => c.name)].join('\n'),
  about: () => data.summary,
  whoami: () => `${data.name} — ${data.role}`,
  ls: () => data.sections.join('  '),
  skills: () => { go('skills'); return '→ skills'; },
  clear: () => { out.innerHTML = ''; },
  exit: () => closeTerm(),
  sudo: () => 'nice try.',
  cd: (a) => { const s = (a[0] || '').replace(/^~?\/?/, ''); if (data.sections.includes(s)) { go(s); return `→ ${s}`; } return `cd: no such directory: ${a[0] ?? ''}`; },
};
$('term-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const line = tin.value.trim(); tin.value = '';
  if (!line) return;
  cmdHistory.push(line); hi = cmdHistory.length;
  termPrint(`$ ${line}`, 'text-fg');
  const [cmd, ...args] = line.split(/\s+/);
  const reg = registry.find((c) => c.name === line.toLowerCase());
  const res = reg ? await reg.run() : builtins[cmd.toLowerCase()]?.(args) ?? `command not found: ${cmd}`;
  if (res) termPrint(String(res), 'text-muted');
});
tin.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && hi > 0) { tin.value = cmdHistory[--hi]; e.preventDefault(); }
  else if (e.key === 'ArrowDown') { tin.value = cmdHistory[++hi] ?? ''; hi = Math.min(hi, cmdHistory.length); e.preventDefault(); }
});

/* ---------- chart tooltips + scroll ---------- */
const tip = document.createElement('div');
tip.className = 'chart-tip';
tip.hidden = true;
tip.setAttribute('role', 'tooltip');
document.body.appendChild(tip);
function showTip(el: Element, x: number, y: number) {
  tip.textContent = el.getAttribute('data-tip') ?? '';
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  tip.style.left = `${Math.max(8, Math.min(x + 12, innerWidth - r.width - 8))}px`;
  tip.style.top = `${y - r.height - 12 < 8 ? y + 18 : y - r.height - 12}px`;
}
document.addEventListener('pointermove', (e) => {
  const el = (e.target as Element).closest?.('[data-tip]');
  if (el) showTip(el, e.clientX, e.clientY); else tip.hidden = true;
});
document.addEventListener('focusin', (e) => {
  const el = (e.target as Element).closest?.('[data-tip]');
  if (el) { const b = el.getBoundingClientRect(); showTip(el, b.left + b.width / 2, b.top); }
});
document.addEventListener('focusout', () => { tip.hidden = true; });
addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
document.querySelectorAll<HTMLElement>('[data-scroll-end]').forEach((el) => { el.scrollLeft = el.scrollWidth; });

/* ---------- global keys ---------- */
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.classList.contains('hidden') ? openPalette() : closePalette(); }
  else if (e.key === 'Escape') { closePalette(); closeTerm(); setMenu(false); }
  else if (e.key === '`' && !typing(e.target)) { e.preventDefault(); term.classList.contains('hidden') ? openTerm() : closeTerm(); }
});

/* ---------- email dialog ---------- */
const emailDialog = document.getElementById('email-dialog') as HTMLDialogElement | null;
if (emailDialog) {
  document.querySelectorAll('[data-email-dialog]').forEach((a) =>
    a.addEventListener('click', (e) => { e.preventDefault(); emailDialog.showModal(); }));
  document.getElementById('email-close')!.addEventListener('click', () => emailDialog.close());
  emailDialog.addEventListener('click', (e) => { if (e.target === emailDialog) emailDialog.close(); });
  const copyBtn = document.getElementById('email-copy')!;
  let copyTimer: number | undefined;
  copyBtn.addEventListener('click', async () => {
    let ok = true;
    try { await navigator.clipboard.writeText(data.email); } catch {
      // Fallback for contexts where the async clipboard API is blocked.
      const t = document.createElement('textarea');
      t.value = data.email; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0';
      emailDialog.appendChild(t); t.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      t.remove(); copyBtn.focus();
    }
    copyBtn.textContent = ok ? 'Copied ✓' : 'Press ⌘C';
    clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1800);
  });
  const form = document.getElementById('email-form') as HTMLFormElement;
  const status = document.getElementById('email-status')!;
  const submit = form.querySelector('button[type=submit]') as HTMLButtonElement;
  const fail = `Couldn't send. Please email ${data.email} instead.`;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submit.disabled = true; submit.textContent = 'Sending…'; status.textContent = '';
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString(),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      status.textContent = 'Thanks! Your message was sent.';
    } catch {
      status.textContent = fail;
    } finally {
      submit.disabled = false; submit.textContent = 'Send';
    }
  });
  emailDialog.addEventListener('close', () => { status.textContent = ''; });
}
