/**
 * PagerWidget — Ambulance Pager System
 * Real-time via ntfy.sh (free, no backend needed)
 */

class PagerWidget {
  constructor() {
    this.topic = this.getTopic();
    this.eventSource = null;
    this.audioCtx = null;
    this.alertCount = 0;
    this.currentAlert = null;
    this.blinkTimer = null;
    this.beepLoop = null;

    this.injectDOM();
    this.bindEvents();
    this.startClock();
    this.connect();
  }

  /* ── TOPIC ── */
  getTopic() {
    let t = localStorage.getItem('pager_topic');
    if (!t) {
      t = 'ambu-pager-' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('pager_topic', t);
    }
    return t;
  }

  setTopic(newTopic) {
    this.topic = newTopic.trim();
    localStorage.setItem('pager_topic', this.topic);
    this.disconnect();
    this.connect();
    return this.topic;
  }

  /* ── DOM INJECTION ── */
  injectDOM() {
    // Toggle button
    const btn = document.createElement('button');
    btn.id = 'pager-toggle-btn';
    btn.title = 'Ouvrir le Pager';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="5" width="20" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/>
        <rect x="5" y="8" width="10" height="5" rx="1.5" fill="currentColor" opacity="0.5"/>
        <circle cx="18" cy="17" r="1.5" fill="currentColor"/>
        <circle cx="15" cy="17" r="1.5" fill="currentColor"/>
        <circle cx="12" cy="17" r="1.5" fill="currentColor"/>
        <circle cx="9" cy="17" r="1.5" fill="currentColor"/>
      </svg>
      <span id="pager-badge"></span>
    `;
    btn.addEventListener('click', () => this.toggle());
    document.body.appendChild(btn);

    // Pager device
    const dev = document.createElement('div');
    dev.id = 'pager-device';
    dev.innerHTML = `
      <div class="pager-body">
        <div class="pager-clip">
          <span style="font-size:9px;color:#555;font-family:monospace;position:relative;z-index:1;letter-spacing:1px;">SAMU</span>
          <button class="pager-close" id="pager-close-btn" title="Fermer">✕</button>
        </div>

        <div class="pager-screen" id="pagerScreen">
          <div class="pager-screen-inner">
            <div class="pager-status" id="pagerStatus">
              <span title="Signal">☀</span>
              <span title="Antenne">▴</span>
              <span title="Volume">◄)</span>
              <span class="status-sep"></span>
              <span id="pagerClock" title="Heure">--:--</span>
              <span>▶</span>
            </div>
            <div class="pager-seg" id="pagerSeg">-- -- &nbsp; 88:88</div>
            <div class="pager-msg" id="pagerMsg">
              <div class="pager-msg-line1" id="pagerLine1">EN ATTENTE...</div>
              <div class="pager-msg-line2" id="pagerLine2"></div>
            </div>
          </div>
        </div>

        <div class="pager-btns">
          <button class="p-btn p-btn-yellow" title="Précédent" onclick="window.__pager.prev()">◀</button>
          <button class="p-btn p-btn-yellow" title="Suivant"   onclick="window.__pager.next()">▶</button>
          <button class="p-btn p-btn-red"    title="Acquitter" onclick="window.__pager.acknowledge()">▲</button>
          <button class="p-btn p-btn-green"  title="Éteindre"  onclick="window.__pager.toggle()">⏻</button>
        </div>
      </div>
    `;
    document.body.appendChild(dev);

    // Toast
    const toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);

    this.el = {
      device: dev,
      toggleBtn: btn,
      badge: document.getElementById('pager-badge'),
      screen: document.getElementById('pagerScreen'),
      status: document.getElementById('pagerStatus'),
      seg: document.getElementById('pagerSeg'),
      msg: document.getElementById('pagerMsg'),
      line1: document.getElementById('pagerLine1'),
      line2: document.getElementById('pagerLine2'),
      clock: document.getElementById('pagerClock'),
      toast: toast,
    };
  }

  /* ── EVENTS ── */
  bindEvents() {
    // Close button
    document.getElementById('pager-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    // Drag
    const dev = this.el.device;
    let dragging = false, ox = 0, oy = 0;

    dev.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true;
      const r = dev.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      dev.classList.add('dragging');
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      let x = e.clientX - ox;
      let y = e.clientY - oy;
      x = Math.max(0, Math.min(window.innerWidth - dev.offsetWidth, x));
      y = Math.max(0, Math.min(window.innerHeight - dev.offsetHeight, y));
      dev.style.left = x + 'px';
      dev.style.top = y + 'px';
      dev.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      dragging = false;
      dev.classList.remove('dragging');
    });

    // Touch drag
    dev.addEventListener('touchstart', (e) => {
      if (e.target.closest('button')) return;
      const t = e.touches[0];
      const r = dev.getBoundingClientRect();
      ox = t.clientX - r.left;
      oy = t.clientY - r.top;
      dragging = true;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      const t = e.touches[0];
      let x = t.clientX - ox;
      let y = t.clientY - oy;
      x = Math.max(0, Math.min(window.innerWidth - dev.offsetWidth, x));
      y = Math.max(0, Math.min(window.innerHeight - dev.offsetHeight, y));
      dev.style.left = x + 'px';
      dev.style.top = y + 'px';
      dev.style.right = 'auto';
    }, { passive: true });

    document.addEventListener('touchend', () => { dragging = false; });
  }

  /* ── NTFY.SH CONNECTION ── */
  connect() {
    this.updateConnStatus('connecting');

    this.eventSource = new EventSource(`https://ntfy.sh/${this.topic}/sse`);

    this.eventSource.addEventListener('open', () => {
      this.updateConnStatus('connected');
      this.showToast('Pager connecté', 'success');
    });

    this.eventSource.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'message') {
          this.receiveAlert(data.title || '', data.message || '');
        }
      } catch (_) {}
    });

    this.eventSource.addEventListener('error', () => {
      this.updateConnStatus('disconnected');
      // Auto-reconnect after 5s
      setTimeout(() => {
        if (this.eventSource) {
          this.eventSource.close();
        }
        this.connect();
      }, 5000);
    });
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.updateConnStatus('disconnected');
  }

  updateConnStatus(state) {
    // Dispatch to any listeners on the page
    window.dispatchEvent(new CustomEvent('pager-conn', { detail: state }));
  }

  /* ── RECEIVE ALERT ── */
  receiveAlert(line1, line2) {
    this.currentAlert = { line1, line2, time: new Date() };
    this.alertCount++;

    // Show device
    this.show();
    this.activateScreen(line1, line2);
    this.playSound();
    this.vibrateDevice();
    this.updateBadge(this.alertCount);
    this.el.toggleBtn.classList.add('alerting');

    // Dispatch event for history
    window.dispatchEvent(new CustomEvent('pager-alert', {
      detail: this.currentAlert
    }));
  }

  activateScreen(line1, line2) {
    const { screen, status, seg, msg, line1: l1, line2: l2 } = this.el;
    screen.classList.add('active');
    status.classList.add('active-status');
    seg.classList.add('active-seg');
    msg.classList.add('active-msg');
    msg.classList.add('blinking');
    l1.textContent = line1;
    l2.textContent = line2;
    seg.textContent = '-- --   ' + this.formatClock();
    // Stop blinking after 8s
    clearTimeout(this.blinkTimer);
    this.blinkTimer = setTimeout(() => {
      msg.classList.remove('blinking');
    }, 8000);
  }

  /* ── SOUND ── */
  getAudioCtx() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    return this.audioCtx;
  }

  playSound() {
    // Try page.mp3 first
    const audio = new Audio('page.mp3');
    audio.play().catch(() => this.playSynth());
  }

  playSynth() {
    const ctx = this.getAudioCtx();
    // Classic two-tone pager bleep pattern
    const pattern = [
      { f: 1400, t: 0.10 },
      { f:  900, t: 0.10 },
      { f: 1400, t: 0.10 },
      { f:  900, t: 0.10 },
      { f: 1400, t: 0.15 },
      { f:    0, t: 0.15 },
      { f: 1400, t: 0.10 },
      { f:  900, t: 0.10 },
      { f: 1400, t: 0.10 },
      { f:  900, t: 0.10 },
      { f: 1400, t: 0.20 },
    ];

    let t = ctx.currentTime + 0.05;
    pattern.forEach(({ f, t: dur }) => {
      if (f > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.01);
        gain.gain.setValueAtTime(0.35, t + dur - 0.01);
        gain.gain.linearRampToValueAtTime(0, t + dur);
        osc.start(t);
        osc.stop(t + dur);
      }
      t += dur;
    });
  }

  vibrateDevice() {
    if (navigator.vibrate) {
      navigator.vibrate([200, 80, 200, 80, 300, 200, 200, 80, 200, 80, 300]);
    }
  }

  /* ── UI CONTROLS ── */
  show() {
    this.el.device.classList.add('visible');
  }

  hide() {
    this.el.device.classList.remove('visible');
  }

  toggle() {
    if (this.el.device.classList.contains('visible')) {
      this.hide();
    } else {
      this.show();
    }
  }

  acknowledge() {
    clearTimeout(this.blinkTimer);
    const { screen, status, seg, msg } = this.el;
    msg.classList.remove('blinking');
    this.alertCount = 0;
    this.updateBadge(0);
    this.el.toggleBtn.classList.remove('alerting');
    this.showToast('Alerte acquittée', 'success');
  }

  prev() { /* placeholder for message history navigation */ }
  next() { /* placeholder for message history navigation */ }

  updateBadge(count) {
    const b = this.el.badge;
    if (count > 0) {
      b.textContent = count;
      b.classList.add('show');
    } else {
      b.classList.remove('show');
    }
  }

  /* ── CLOCK ── */
  formatClock() {
    const n = new Date();
    return String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
  }

  startClock() {
    const update = () => {
      if (this.el.clock) this.el.clock.textContent = this.formatClock();
    };
    update();
    setInterval(update, 10000);
  }

  /* ── TOAST ── */
  showToast(msg, type = 'info') {
    const t = this.el.toast;
    t.textContent = msg;
    t.className = `show ${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { t.className = ''; }, 2800);
  }
}

// Auto-init
window.addEventListener('DOMContentLoaded', () => {
  window.__pager = new PagerWidget();
});
