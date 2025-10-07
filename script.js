
// Clean, single-file JS for role selection, admin password, and messages
window.addEventListener('DOMContentLoaded', () => {
  // Role is stored in localStorage; if not set we ask the visitor
  let role = localStorage.getItem('role');
  const overlay = document.getElementById('roleOverlay');
  const infoBox = document.getElementById('infoBox');
  const errorBox = document.getElementById('errorBox');
  const composerBox = document.getElementById('composerBox');
  const changeRoleBtn = document.getElementById('changeRoleBtn');
  const chooseUserBtn = document.getElementById('chooseUser');
  const chooseAdminBtn = document.getElementById('chooseAdmin');
  const confirmAdminBtn = document.getElementById('confirmAdmin');
  const adminPassEl = document.getElementById('adminPass');
  const sendBtn = document.getElementById('sendBtn');
  const messagesEl = document.getElementById('messages');

  // Messages stored locally as an array of { text, role, time } when Firestore is not used
  let messages = JSON.parse(localStorage.getItem('messages') || '[]');

  // Firestore integration (optional)
  // Realtime Database integration (optional) — simpler than Firestore for quick demos
  let useRealtimeDB = false;
  let realtimeDB = null;
  let messagesRef = null;

  if (window.FIREBASE_CONFIG && typeof firebase !== 'undefined' && firebase && firebase.initializeApp) {
    try {
      if (!firebase.apps || firebase.apps.length === 0) firebase.initializeApp(window.FIREBASE_CONFIG);
      if (firebase.database) {
        realtimeDB = firebase.database();
        messagesRef = realtimeDB.ref('messages');
        useRealtimeDB = true;
      }
    } catch (err) {
      console.warn('Firebase Realtime DB init failed:', err);
      useRealtimeDB = false;
    }
  }

  function showOverlay() {
    if (errorBox) errorBox.textContent = '';
    if (infoBox) infoBox.textContent = '';
    if (overlay) overlay.classList.add('visible');
  }

  function hideOverlay() {
    if (overlay) overlay.classList.remove('visible');
  }

  function setupRole(r) {
    role = r;
    if (role === 'admin') {
      if (composerBox) composerBox.style.display = 'flex';
    } else {
      if (composerBox) composerBox.style.display = 'none';
    }
    renderMessages();
  }

  function renderMessages() {
    if (!messagesEl) return;
    messagesEl.innerHTML = '';
    messages.forEach((msg, idx) => {
      const div = document.createElement('div');
      div.className = 'msg';
      const roleText = (msg.role || 'user').toUpperCase();
      const timeText = msg.time ? new Date(msg.time).toLocaleString() : '';
      div.innerHTML = `\n        <div class="meta">${roleText} - ${timeText}</div>\n        <div>${msg.text}</div>\n      `;
      if (role === 'admin') {
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.textContent = '🗑 Delete';
        delBtn.onclick = () => {
          if (useRealtimeDB && msg._id && messagesRef) {
            messagesRef.child(msg._id).remove().then(() => {
              if (infoBox) infoBox.textContent = '✔ Message deleted';
            }).catch(() => { if (errorBox) errorBox.textContent = 'Delete failed'; });
          } else {
            messages.splice(idx, 1);
            localStorage.setItem('messages', JSON.stringify(messages));
            renderMessages();
            if (infoBox) infoBox.textContent = '✔ Message deleted';
          }
        };
        div.appendChild(delBtn);
      }
      messagesEl.appendChild(div);
    });
  }

  // Initial state: show overlay if no role selected
  if (!role) showOverlay();
  else setupRole(role);

  // Change role button
  if (changeRoleBtn) {
    changeRoleBtn.addEventListener('click', () => {
      localStorage.removeItem('role');
      role = null;
      showOverlay();
      if (composerBox) composerBox.style.display = 'none';
    });
  }

  // Choose user
  if (chooseUserBtn) {
    chooseUserBtn.addEventListener('click', () => {
      localStorage.setItem('role', 'user');
      setupRole('user');
      hideOverlay();
    });
  }

  // Choose admin (reveal password)
  if (chooseAdminBtn) {
    chooseAdminBtn.addEventListener('click', () => {
      chooseAdminBtn.style.display = 'none';
      const passField = document.getElementById('adminPassField');
      if (passField) passField.style.display = 'block';
      if (adminPassEl) {
        adminPassEl.value = '';
        adminPassEl.focus();
      }
    });
  }

  // Confirm admin password
  if (confirmAdminBtn) {
    confirmAdminBtn.addEventListener('click', () => {
      const pass = adminPassEl ? adminPassEl.value : '';
      if (pass === 'admin1012') {
        localStorage.setItem('role', 'admin');
        setupRole('admin');
        hideOverlay();
      } else {
        if (errorBox) errorBox.textContent = '❌ Wrong password';
      }
    });
  }

  // Send message
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const textEl = document.getElementById('textInput');
      const text = textEl ? textEl.value.trim() : '';
      if (!text) {
        if (infoBox) infoBox.textContent = '⚠ Please write something before sending';
        return;
      }
      const msg = { text, role, time: Date.now() };
      if (useRealtimeDB && messagesRef) {
        // push a new node; Realtime DB will generate a key
        messagesRef.push(msg).then(() => {
          if (infoBox) infoBox.textContent = '✔ Message sent';
          if (textEl) textEl.value = '';
        }).catch(() => { if (errorBox) errorBox.textContent = 'Send failed'; });
      } else {
        messages.push(msg);
        localStorage.setItem('messages', JSON.stringify(messages));
        if (textEl) textEl.value = '';
        renderMessages();
        if (infoBox) infoBox.textContent = '✔ Message sent';
      }
    });
  }

  // Keyboard niceties
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('visible')) hideOverlay();
  });
  if (adminPassEl && confirmAdminBtn) {
    adminPassEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmAdminBtn.click();
      }
    });
  }
  if (sendBtn) {
    const textInputEl = document.getElementById('textInput');
    if (textInputEl) {
      textInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          sendBtn.click();
        }
      });
    }
  }

  // focus trap
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (!overlay || !overlay.classList.contains('visible')) return;
    const modal = overlay.querySelector('.modal');
    if (!modal) return;
    const focusable = Array.from(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // focus first control when overlay opens
  const observer = new MutationObserver(() => {
    if (overlay && overlay.classList.contains('visible')) {
      const focusable = overlay.querySelector('.modal button, .modal input, .modal [tabindex]');
      if (focusable) focusable.focus();
    }
  });
  if (overlay) observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });

  // Defer rendering messages to idle time to improve first paint
  const defer = window.requestIdleCallback || function (cb) { return setTimeout(cb, 200); };
  defer(() => {
    if (useRealtimeDB && messagesRef) {
      // Listen for realtime updates and map them to the local `messages` array
      messagesRef.orderByChild('time').on('value', snapshot => {
        const data = snapshot.val() || {};
        messages = Object.keys(data).map(key => Object.assign({ _id: key }, data[key]));
        messages.sort((a, b) => (a.time || 0) - (b.time || 0));
        renderMessages();
      }, err => {
        console.error('Realtime DB read error', err);
        messages = JSON.parse(localStorage.getItem('messages') || '[]');
        renderMessages();
      });
    } else {
      renderMessages();
    }
  });

  // When the page unloads, clean up Firestore listener if present
  window.addEventListener('beforeunload', () => {
    if (messagesUnsubscribe) messagesUnsubscribe();
  });
});
