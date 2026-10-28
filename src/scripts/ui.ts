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
interface ApiStatus { status: string; version: string; startedAt: string; uptimeSeconds: number; goVersion: string; requests: number }
class ApiError extends Error {}

async function apiStatus(): Promise<ApiStatus> {
  if (!data.apiUrl) throw new ApiError('no backend configured (PUBLIC_API_URL was not set when the site was built)');
  const url = `${data.apiUrl}/api/status`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new ApiError(`GET ${url} returned HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`);
    try { return (await res.json()) as ApiStatus; }
    catch (e) { throw new ApiError(`GET ${url} returned a response that is not valid JSON (${(e as Error).message})`); }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === 'AbortError') throw new ApiError(`GET ${url} timed out after 3s`);
    // Browsers report network failures and CORS blocks identically, so say both.
    throw new ApiError(`GET ${url} failed: ${(e as Error).message} (network error, or blocked by CORS: the browser does not say which)`);
  } finally { clearTimeout(timer); }
}
const errText = (e: unknown) => `error: ${e instanceof Error ? e.message : String(e)}`;
const fmtUptime = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return [d && `${d}d`, (d || h) && `${h}h`, `${m}m`].filter(Boolean).join(' ');
};

/* ---------- shared command registry ---------- */
interface Cmd { name: string; hint: string; run: () => string | void | Promise<string | void> }
const go = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
const registry: Cmd[] = [
  ...data.sections.map((s: string): Cmd => ({ name: `goto ${s}`, hint: `Jump to ${s}`, run: () => { go(s); return `→ ${s}`; } })),
  ...data.links.map((l: { label: string; href: string }): Cmd => ({ name: `open ${l.label.toLowerCase().replace(/\s+/g, '-')}`, hint: l.href, run: () => { window.open(l.href, '_blank', 'noopener'); return `opening ${l.href}`; } })),
  { name: 'resume', hint: 'Open resume (PDF)', run: () => { window.open('/ResumeNathanielJohnson.pdf', '_blank', 'noopener'); return 'opening resume…'; } },
  { name: 'email', hint: data.email, run: () => { location.href = `mailto:${data.email}`; return data.email; } },
  { name: 'status', hint: 'Live backend status', run: async () => {
      try { const a = await apiStatus(); return `api: ${a.status}\nversion: ${a.version}\nuptime: ${fmtUptime(a.uptimeSeconds)}\nruntime: ${a.goVersion}\nrequests served: ${a.requests}`; }
      catch (e) { return errText(e); }
    } },
  { name: 'uptime', hint: 'How long the backend has been up', run: async () => {
      try { return `up ${fmtUptime((await apiStatus()).uptimeSeconds)}`; } catch (e) { return errText(e); }
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
    li.addEventListener('click', () => { closePalette(); c.run(); });
    palList.appendChild(li);
  });
  if (!shown.length) palList.innerHTML = '<li class="px-4 py-2 text-muted">No matches</li>';
}
function openPalette() { pal.classList.replace('hidden', 'flex'); palIn.value = ''; sel = 0; renderPalette(); palIn.focus(); }
function closePalette() { pal.classList.replace('flex', 'hidden'); }
$('open-palette').addEventListener('click', openPalette);
pal.addEventListener('click', (e) => e.target === pal && closePalette());
palIn.addEventListener('input', () => { sel = 0; renderPalette(); });
palIn.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); renderPalette(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); renderPalette(); e.preventDefault(); }
  else if (e.key === 'Enter' && shown[sel]) { closePalette(); shown[sel].run(); }
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

/* ---------- global keys ---------- */
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.classList.contains('hidden') ? openPalette() : closePalette(); }
  else if (e.key === 'Escape') { closePalette(); closeTerm(); }
  else if (e.key === '`' && !typing(e.target)) { e.preventDefault(); term.classList.contains('hidden') ? openTerm() : closeTerm(); }
});
