export {};
// Chat widget: streams answers from the backend's POST /api/chat (see worker/). Optional: does nothing when
// the markup is absent (no PUBLIC_API_URL at build time). Model output is only ever written via textContent.
const data = JSON.parse(document.getElementById('cmd-data')!.textContent!);
const panel = document.getElementById('chat');
if (panel && data.apiUrl) init(panel);

interface Msg { role: 'user' | 'assistant'; content: string }
interface ApiErr { error?: string; message?: string; retryAfter?: number; scope?: 'minute' | 'day' | 'global' }

function init(panel: HTMLElement) {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const launcher = $('chat-launcher'), log = $('chat-log'), empty = $('chat-empty'), notice = $('chat-notice');
  const form = $<HTMLFormElement>('chat-form'), input = $<HTMLTextAreaElement>('chat-input'), send = $<HTMLButtonElement>('chat-send');
  const count = $('chat-count'), left = $('chat-left'), clearBtn = $('chat-clear');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MAX_MSGS = 12, CONNECT_MS = 20_000, STALL_MS = 30_000;
  const history: Msg[] = [];
  let gen = 0; // bumped by Clear so an in-flight request can tell it was discarded
  let busy = false, locked = false, cooling = false;
  let ctrl: AbortController | null = null;
  let cooldownTimer: ReturnType<typeof setInterval> | undefined;

  /* ---------- state ---------- */
  function sync() {
    const off = locked || cooling;
    input.disabled = off;
    send.textContent = busy ? 'Stop' : 'Send';
    send.disabled = off && !busy;
    send.setAttribute('aria-label', busy ? 'Stop generating' : 'Send question');
    log.setAttribute('aria-busy', String(busy));
    panel.querySelectorAll<HTMLButtonElement>('.chat-chip').forEach((b) => { b.disabled = busy || off; });
    clearBtn.classList.toggle('hidden', history.length === 0 && !busy);
  }
  function showNotice(build: (el: HTMLElement) => void) { notice.replaceChildren(); build(notice); notice.classList.remove('hidden'); }
  function hideNotice() { notice.classList.add('hidden'); notice.replaceChildren(); }
  function setLeft(n: number | null) {
    left.textContent = n === null ? '' : `${n} question${n === 1 ? '' : 's'} left today`;
  }
  function resize() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
    const n = input.value.length;
    count.textContent = `${n}/500`;
    count.classList.toggle('hidden', n < 400);
  }

  /* ---------- rendering ---------- */
  const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 48;
  function bubble(role: Msg['role']): HTMLElement {
    const stick = nearBottom() || role === 'user';
    const d = document.createElement('div');
    d.className = role === 'user' ? 'chat-user' : 'chat-ai';
    const who = document.createElement('span');
    who.className = 'sr-only';
    who.textContent = role === 'user' ? 'You: ' : `${data.name.split(' ')[0]}'s AI: `;
    d.appendChild(who);
    d.appendChild(document.createElement('span')); // text target
    empty.classList.add('hidden');
    log.appendChild(d);
    if (stick) log.scrollTop = log.scrollHeight;
    return d;
  }
  const textOf = (d: HTMLElement) => d.lastElementChild as HTMLElement;
  function typingDots(d: HTMLElement) {
    const t = document.createElement('span');
    t.className = 'typing';
    t.setAttribute('aria-label', 'Thinking');
    t.innerHTML = '<i></i><i></i><i></i>'; // static markup, no model output
    textOf(d).replaceChildren(t);
  }
  function resetLog() {
    log.querySelectorAll('.chat-user, .chat-ai').forEach((n) => n.remove());
    empty.classList.remove('hidden');
  }

  /* ---------- open / close ---------- */
  const isOpen = () => !panel.classList.contains('hidden');
  function open() {
    if (isOpen()) { input.focus(); return; }
    dispatchEvent(new CustomEvent('terminal:close'));
    panel.classList.replace('hidden', 'flex');
    launcher.classList.add('hidden');
    sync();
    if (!input.disabled) input.focus(); else panel.focus();
  }
  function close(refocus: boolean) {
    if (!isOpen()) return;
    panel.classList.replace('flex', 'hidden');
    launcher.classList.remove('hidden');
    if (refocus) launcher.focus();
  }
  addEventListener('chat:open', open);
  addEventListener('chat:close', () => close(false));
  launcher.addEventListener('click', open);
  document.querySelectorAll('[data-chat-open]').forEach((el) => el.addEventListener('click', open));
  $('chat-close').addEventListener('click', () => close(true));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen() && panel.contains(document.activeElement)) { e.stopPropagation(); close(true); }
  });
  clearBtn.addEventListener('click', () => {
    ctrl?.abort();
    gen++;
    history.length = 0;
    resetLog();
    hideNotice();
    sync();
    if (!input.disabled) input.focus();
  });

  /* ---------- errors ---------- */
  function startCooldown(seconds: number, message: string) {
    clearInterval(cooldownTimer);
    let n = Math.max(1, Math.ceil(seconds));
    cooling = true;
    const render = () => showNotice((el) => { el.textContent = `${message} Try again in ${n}s.`; });
    render();
    sync();
    cooldownTimer = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(cooldownTimer);
        cooling = false;
        hideNotice();
        sync();
        if (isOpen()) input.focus();
      } else render();
    }, 1000);
  }
  function lockForToday(message: string) {
    locked = true;
    showNotice((el) => {
      el.append(`${message} Come back tomorrow (resets at 00:00 UTC), or `);
      const a = document.createElement('a');
      a.href = `mailto:${data.email}`;
      a.textContent = 'email me';
      el.append(a, ' instead.');
    });
    sync();
  }
  const note = (text: string) => showNotice((el) => { el.textContent = text; });

  /* ---------- action markers ---------- */
  // The model ends contact answers with CONTACT_MARK. It is never shown as text: the marker (and any
  // half-streamed prefix of it) is stripped, and a button is added once the answer is complete.
  const CONTACT_MARK = '[[contact]]';
  function visibleText(raw: string, done = false) {
    let t = raw.split(CONTACT_MARK).join('');
    if (!done) {
      for (let n = Math.min(CONTACT_MARK.length - 1, t.length); n > 0; n--) {
        if (t.endsWith(CONTACT_MARK.slice(0, n))) { t = t.slice(0, -n); break; }
      }
    }
    return t.trimEnd();
  }
  // Model output becomes DOM nodes, never HTML. Only http(s) and mailto links are ever created:
  // [label](url), bare URLs and email addresses. **bold** becomes <strong>.
  const LINK_RE = /\*\*([^*\n]{1,120})\*\*|\[([^\]\n]{1,100})\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|(https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"])|([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;
  function renderText(el: HTMLElement, text: string) {
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const m of text.matchAll(LINK_RE)) {
      const [full, boldText, label, mdUrl, bare, email] = m;
      if (m.index! > last) frag.append(text.slice(last, m.index));
      last = m.index! + full.length;
      if (boldText !== undefined) {
        const b = document.createElement('strong');
        b.textContent = boldText;
        frag.append(b);
        continue;
      }
      const a = document.createElement('a');
      a.href = mdUrl ?? bare ?? `mailto:${email}`;
      a.textContent = label ?? bare ?? email;
      a.className = 'text-accent underline underline-offset-2 [overflow-wrap:anywhere]';
      if (!a.href.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      frag.append(a);
    }
    frag.append(text.slice(last));
    el.replaceChildren(frag);
  }
  const BTN = 'btn-solid rounded-md px-3 py-1.5 font-sans text-xs font-semibold';
  // The contact dialog claims this event with preventDefault(); otherwise jump to the Contact section.
  function openContact(message?: string) {
    if (dispatchEvent(new CustomEvent('contact:open', { cancelable: true, detail: { message } }))) {
      document.getElementById('contact')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      close(false);
    }
  }
  function addContactButton(out: HTMLElement) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `${BTN} mt-3 block`;
    b.textContent = `Contact ${data.name.split(' ')[0]}`;
    b.addEventListener('click', () => openContact());
    out.append(b);
  }
  // Shown when the model had no answer (ask_nathan tool). Yes opens the contact form with the
  // visitor's last three questions pre-filled.
  function addAskOffer(out: HTMLElement) {
    const first = data.name.split(' ')[0];
    const box = document.createElement('div');
    box.className = 'mt-3 rounded-md border border-border bg-surface p-2.5';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', `Ask ${first}`);
    const q = document.createElement('p');
    q.className = 'mb-2 font-sans text-xs font-semibold';
    q.textContent = `Do you want to ask ${first} this question?`;
    const row = document.createElement('div');
    row.className = 'flex gap-2';
    const yes = document.createElement('button');
    yes.type = 'button';
    yes.className = BTN;
    yes.textContent = `Yes, message ${first}`;
    yes.addEventListener('click', () => {
      const asked = [...new Set(history.filter((m) => m.role === 'user').map((m) => m.content))].slice(-3).map((m) => `- ${m}`);
      openContact(`Hi ${first}, I was using the AI chat on your site and it couldn't answer ${asked.length > 1 ? 'these questions' : 'this question'}:\n\n${asked.join('\n')}\n\n`);
      box.remove();
    });
    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'rounded-md border border-border px-3 py-1.5 font-sans text-xs text-muted hover:text-fg';
    no.textContent = 'No thanks';
    no.addEventListener('click', () => box.remove());
    row.append(yes, no);
    box.append(q, row);
    out.append(box);
  }

  /* ---------- request ---------- */
  async function ask(text: string) {
    hideNotice();
    history.push({ role: 'user', content: text });
    const userEl = bubble('user');
    textOf(userEl).textContent = text;
    const aiEl = bubble('assistant');
    typingDots(aiEl);
    const out = textOf(aiEl);

    busy = true;
    ctrl = new AbortController();
    const my = ctrl;
    const myGen = gen;
    let reason: 'user' | 'timeout' | null = null;
    let timer = setTimeout(() => { reason = 'timeout'; my.abort(); }, CONNECT_MS);
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => { reason = 'timeout'; my.abort(); }, STALL_MS); };
    my.signal.addEventListener('abort', () => { reason ??= 'user'; });
    sync();

    let got = '';
    let askOffer = false; // the model called ask_nathan: offer to forward the question
    let finished = false;
    let failed: (() => void) | null = null; // deferred notice, shown after cleanup
    let unsend = false; // request produced nothing: put the question back in the box

    try {
      let msgs = history.slice(-MAX_MSGS).map((m) => (m.role === 'assistant' && m.content.length > 1500 ? { ...m, content: m.content.slice(0, 1500) } : m));
      while (msgs.length && msgs[0].role !== 'user') msgs = msgs.slice(1);
      const res = await fetch(`${data.apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs }),
        signal: my.signal,
      });
      const rem = Number(res.headers.get('X-RateLimit-Remaining-Day'));
      if (res.headers.get('X-RateLimit-Remaining-Day') !== null && Number.isFinite(rem)) setLeft(rem);

      if (!res.ok) {
        unsend = true;
        const err: ApiErr = await res.json().catch(() => ({}));
        const msg = err.message || `The chat service returned an error (HTTP ${res.status}).`;
        if (res.status === 429 && err.scope === 'minute') failed = () => startCooldown(err.retryAfter ?? (Number(res.headers.get('Retry-After')) || 30), msg);
        else if (res.status === 429) failed = () => lockForToday(msg);
        else failed = () => note(msg);
      } else if (!res.body) {
        unsend = true;
        failed = () => note('The chat service sent an empty response. Please try again.');
      } else {
        arm();
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        const onLine = (raw: string) => {
          const line = raw.trim();
          if (!line.startsWith('data:')) return;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') { finished = true; return; }
          let j: unknown;
          try { j = JSON.parse(payload); } catch { return; }
          if ((j as { action?: unknown })?.action === 'ask_nathan') { askOffer = true; return; }
          const resp = (j as { response?: unknown })?.response;
          // Workers AI sends purely numeric tokens ("202", "0") as JSON numbers, not strings.
          const tok = typeof resp === 'number' ? String(resp) : resp;
          if (typeof tok !== 'string' || !tok) return;
          const stick = nearBottom();
          got += tok;
          const shown = visibleText(got);
          if (!shown) return; // only a partial marker so far: keep the typing indicator
          renderText(out, shown);
          if (stick) log.scrollTop = log.scrollHeight;
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          arm();
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          lines.forEach(onLine);
        }
        onLine(buf);
        if (!got && askOffer) { got = "I don't have that information."; renderText(out, got); }
        if (!got) { unsend = true; failed = () => note('The AI returned an empty answer. Try rephrasing your question.'); }
        else if (!finished) failed = () => note('The response ended early and may be incomplete.');
      }
    } catch (e) {
      if (reason === 'user') { /* stopped on purpose: keep any partial answer */ }
      else if (reason === 'timeout') failed = () => note(got ? 'The AI stopped responding mid-answer. What you see may be incomplete.' : 'The AI took too long to respond. Please try again.');
      else failed = () => note(got ? 'The connection dropped mid-answer. What you see may be incomplete.' : "Couldn't reach the chat service. Check your connection and try again.");
      void e;
      if (!got) unsend = true;
    } finally {
      clearTimeout(timer);
    }

    busy = false;
    ctrl = null;
    if (myGen !== gen) { sync(); return; } // chat was cleared meanwhile
    if (!got) {
      aiEl.remove();
      if (unsend || reason === 'user') {
        // Nothing came back: drop the question from history and hand it back for editing or retry.
        userEl.remove();
        history.pop();
        if (!input.value) { input.value = text; resize(); }
        if (!history.length) empty.classList.remove('hidden');
      }
    } else {
      history.push({ role: 'assistant', content: visibleText(got, true) });
      if (askOffer) addAskOffer(out);
      else if (got.includes(CONTACT_MARK)) addContactButton(out);
    }
    failed?.();
    if (rem0() === 0 && !locked && !cooling) lockForToday('That was your last question for today.');
    sync();
    if (isOpen() && !input.disabled) input.focus();
  }
  const rem0 = () => { const m = /^(\d+) question/.exec(left.textContent ?? ''); return m ? Number(m[1]) : null; };

  /* ---------- input wiring ---------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (busy) { ctrl?.abort(); return; }
    if (locked || cooling) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    resize();
    void ask(text);
  });
  input.addEventListener('input', resize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!busy) form.requestSubmit(); }
  });
  panel.querySelectorAll<HTMLButtonElement>('.chat-chip').forEach((b) => b.addEventListener('click', () => {
    if (busy || locked || cooling) return;
    void ask(b.dataset.q ?? b.textContent ?? '');
  }));
  void reduceMotion;
  sync();
}
