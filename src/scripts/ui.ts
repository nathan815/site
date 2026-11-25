export {};
const data = JSON.parse(document.getElementById('cmd-data')!.textContent!);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/* ---------- theme ---------- */
// Icon-only button: the label says what a press does, matching the icon shown (sun in dark, moon in light).
const labelTheme = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  $('toggle-theme').setAttribute('aria-label', `Switch to ${next} theme`);
};
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
  labelTheme();
  return next;
}
labelTheme();
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

/* ---------- view counter ---------- */
// Records one view per browser session (reloads don't count) and shows totals in the footer.
// Silent on any failure: the counter is decoration.
(async () => {
  const el = document.getElementById('view-counter');
  if (!el || !data.apiUrl) return;
  let seen = false;
  try { seen = sessionStorage.getItem('viewed') === '1'; } catch {}
  try {
    const res = await fetch(`${data.apiUrl}/api/views`, { method: seen ? 'GET' : 'POST', signal: AbortSignal.timeout(4000) });
    if (!res.ok) return;
    const v = (await res.json()) as { total: number; week: number };
    if (typeof v.total !== 'number' || typeof v.week !== 'number') return;
    try { sessionStorage.setItem('viewed', '1'); } catch {}
    const n = new Intl.NumberFormat();
    el.replaceChildren(...[[v.total, v.total === 1 ? 'view' : 'views'], [v.week, 'this week']].map(([num, label]) => {
      const chip = document.createElement('span');
      chip.className = 'stat';
      const b = document.createElement('b');
      b.textContent = n.format(num as number);
      chip.append(b, ` ${label}`);
      return chip;
    }));
    el.hidden = false;
  } catch {}
})();

/* ---------- shared command registry ---------- */
interface Cmd { name: string; rest?: boolean; hint: string; target?: string; showOutput?: boolean; run: () => string | void | Promise<string | void> }
const go = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
const registry: Cmd[] = [
  ...data.sections.map((s: string): Cmd => ({ name: `goto ${s}`, hint: `Jump to ${s}`, target: s, run: () => { go(s); return `→ ${s}`; } })),
  { name: 'email', hint: data.email, run: () => { location.href = `mailto:${data.email}`; return data.email; } },
  { name: 'status', hint: 'Live backend status', showOutput: true, run: async () => {
      try {
        const [a, v] = await Promise.all([apiGet<ApiStatus>('/api/status'), apiGet<{ total: number; week: number }>('/api/views').catch(() => null)]);
        return [`api: ${a.status}`, `version: ${a.version}`, `runtime: ${a.runtime}`, `edge: ${a.region ?? 'unknown'}`, `requests served: ${a.requests ?? 'n/a'}`, `site views: ${v ? `${v.total} total, ${v.week} in the last 7 days` : 'n/a'}`].join('\n');
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
  ...(data.apiUrl ? [{ name: 'ask', hint: 'Ask the AI about Nathan', run: () => { dispatchEvent(new CustomEvent('chat:open')); } } as Cmd] : []),
  { name: 'theme', hint: 'Toggle light/dark', run: () => `theme: ${toggleTheme()}` },
  { name: 'terminal', hint: 'Open the terminal', run: () => { openTerm(); } },
  ...(data.items as { kind: string; name: string; hint: string; target: string }[]).filter((i) => i.kind !== 'open').map((i): Cmd => ({ rest: true, name: `goto ${i.name.toLowerCase()}`, hint: i.hint, target: i.target, run: () => { const el = document.getElementById(i.target); if (el instanceof HTMLDetailsElement) el.open = true; go(i.target); return `→ ${i.name}`; } })),
  ...data.links.map((l: { label: string; href: string }): Cmd => ({ rest: true, name: `open ${l.label.toLowerCase().replace(/\s+/g, '-')}`, hint: l.href, run: () => { window.open(l.href, '_blank', 'noopener'); return `opening ${l.href}`; } })),
  ...(data.items as { kind: string; name: string; hint: string; target: string }[]).filter((i) => i.kind === 'open').map((i): Cmd => ({ rest: true, name: `repo ${i.name.toLowerCase()}`, hint: i.hint, run: () => { window.open(i.target, '_blank', 'noopener'); return `opening ${i.target}`; } })),
];

/* ---------- focus helpers ---------- */
type Focusable = HTMLElement | SVGElement; // chart bars are focusable SVG rects
const currentFocus = (): Focusable | null => {
  const a = document.activeElement;
  return (a instanceof HTMLElement || a instanceof SVGElement) && a !== document.body && !$('palette').contains(a) ? a : null;
};
// Falls back to the Search button when the saved element is gone or hidden (e.g. the chat closed meanwhile).
const restoreFocus = (el: Focusable | null) => (el?.isConnected && el.getClientRects().length ? el : $('open-palette')).focus();
// Navigation commands move keyboard focus along with the scroll position.
function focusTarget(id: string) {
  const el = document.getElementById(id);
  const t = el instanceof HTMLDetailsElement ? el.querySelector('summary') : el;
  if (!t) return restoreFocus(null);
  if (t === el) t.setAttribute('tabindex', '-1');
  t.focus({ preventScroll: true });
}

/* ---------- palette ---------- */
const pal = $('palette'), palIn = $<HTMLInputElement>('palette-input'), palList = $('palette-list'), palStatus = $('palette-status');
let sel = 0, shown: Cmd[] = [];
let palReturn: Focusable | null = null; // element to refocus when the palette closes
let statusTimer: number | undefined;
function renderPalette() {
  const q = palIn.value.trim().toLowerCase();
  shown = registry.filter((c) => !q || c.name.includes(q) || c.hint.toLowerCase().includes(q));
  sel = Math.min(sel, Math.max(shown.length - 1, 0));
  palList.innerHTML = '';
  shown.forEach((c, i) => {
    const li = document.createElement('li');
    li.id = `pal-opt-${i}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === sel));
    li.className = `flex cursor-pointer items-center justify-between gap-4 px-4 py-2 ${i === sel ? 'bg-bg text-fg' : 'text-muted'}${c.rest && i > 0 && !shown[i - 1].rest ? ' mt-1 border-t border-border pt-3' : ''}`;
    li.innerHTML = `<span class="max-w-[60%] shrink-0 truncate whitespace-nowrap font-mono"></span><span class="min-w-0 flex-1 truncate text-right text-xs leading-6"></span>`;
    (li.children[0] as HTMLElement).textContent = c.name;
    (li.children[1] as HTMLElement).textContent = c.hint;
    li.addEventListener('click', () => runFromPalette(c));
    palList.appendChild(li);
  });
  if (!shown.length) palList.innerHTML = '<li class="px-4 py-2 text-muted" role="presentation">No matches</li>';
  if (shown.length) {
    palIn.setAttribute('aria-activedescendant', `pal-opt-${sel}`);
    document.getElementById(`pal-opt-${sel}`)?.scrollIntoView({ block: 'nearest' });
  } else palIn.removeAttribute('aria-activedescendant');
  // Debounced so screen readers hear the final count, not one per keystroke.
  clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => { palStatus.textContent = shown.length ? `${shown.length} result${shown.length === 1 ? '' : 's'}` : 'No matches'; }, 400);
}
// Commands that produce text (status, ping) show it in the terminal; the rest just act.
async function runFromPalette(c: Cmd) {
  closePalette(false);
  if (!c.showOutput) {
    c.run();
    if (c.target) focusTarget(c.target);
    else if (!currentFocus()) restoreFocus(palReturn); // terminal and ask move focus themselves
    palReturn = null;
    return;
  }
  openTerm();
  palReturn = null;
  termPrint(`$ ${c.name}`, 'text-fg');
  const res = await c.run();
  if (res) termPrint(String(res), 'text-muted');
}
// Inert background: nothing behind the palette can take focus, including chat code that refocuses its input.
const setBackgroundInert = (on: boolean) => { for (const el of document.body.children) if (el !== pal && el instanceof HTMLElement) el.inert = on; };
function openPalette() {
  if (pal.classList.contains('hidden')) palReturn = currentFocus();
  pal.classList.replace('hidden', 'flex'); palIn.value = ''; sel = 0; renderPalette(); palIn.focus();
  setBackgroundInert(true);
}
// refocus=false when a command runs: runFromPalette decides where focus goes.
function closePalette(refocus = true) {
  if (pal.classList.contains('hidden')) return;
  pal.classList.replace('flex', 'hidden');
  setBackgroundInert(false);
  palStatus.textContent = '';
  if (refocus) { restoreFocus(palReturn); palReturn = null; }
}
$('open-palette').addEventListener('click', openPalette);
pal.addEventListener('click', (e) => e.target === pal && closePalette());
// Modal: the input is the only focusable element, so keep Tab inside.
pal.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); palIn.focus(); } });
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
let termReturn: Focusable | null = null;
function openTerm() {
  if (term.classList.contains('hidden')) termReturn = currentFocus() ?? palReturn;
  dispatchEvent(new CustomEvent('chat:close')); // the chat panel and terminal share the bottom-right corner
  term.classList.remove('hidden');
  if (!greeted) { greeted = true; termPrint(`Welcome. Type "help" to list commands.`, 'text-muted'); }
  tin.focus();
}
// Return focus to where it was, but only if it was inside the terminal (otherwise the user already moved on).
function closeTerm(refocus = true) {
  if (term.classList.contains('hidden')) return;
  const hadFocus = term.contains(document.activeElement);
  term.classList.add('hidden');
  if (refocus && hadFocus) restoreFocus(termReturn);
  termReturn = null;
}
addEventListener('terminal:close', () => closeTerm(false));
$('terminal-close').addEventListener('click', () => closeTerm());
const usage = (verb: string) => `usage: ${verb} <name>\n${registry.filter((c) => c.name.startsWith(`${verb} `)).map((c) => `  ${c.name}`).join('\n')}`;
const builtins: Record<string, (a: string[]) => string | void> = {
  help: () => ['about, whoami, skills, ls, clear, exit, goto, open, repo, email, status, ping, ask, theme', 'Type goto, open or repo on its own for usage.'].join('\n'),
  goto: () => usage('goto'),
  open: () => usage('open'),
  repo: () => usage('repo'),
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
  else if (e.key === 'Escape' && !pal.classList.contains('hidden')) { e.stopImmediatePropagation(); closePalette(); } // top layer only: chat also listens for Escape
  else if (e.key === 'Escape') { closeTerm(); setMenu(false); }
  else if (e.key === '`' && !typing(e.target)) { e.preventDefault(); term.classList.contains('hidden') ? openTerm() : closeTerm(); }
});

/* ---------- email dialog ---------- */
const emailDialog = document.getElementById('email-dialog') as HTMLDialogElement | null;
if (emailDialog) {
  document.querySelectorAll('[data-email-dialog]').forEach((a) =>
    a.addEventListener('click', (e) => { e.preventDefault(); emailDialog.showModal(); }));
  // The chat's "Contact" button asks for this dialog; preventDefault tells it the request was handled.
  // detail.message pre-fills the message box (used by the chat's "ask Nathan" offer).
  addEventListener('contact:open', (e) => {
    e.preventDefault();
    const message = (e as CustomEvent<{ message?: string }>).detail?.message;
    const box = emailDialog.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
    if (message && box) box.value = message;
    if (!emailDialog.open) emailDialog.showModal();
    if (message) emailDialog.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  });
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

/* ---------- portrait reveals the Troy dot on tap ---------- */
document.querySelector('.me-photo')?.addEventListener('click', (e) => {
  (e.currentTarget as HTMLElement).closest('section')?.classList.toggle('show-troy');
});
