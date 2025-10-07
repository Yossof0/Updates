
// Clean, single-file JS for role selection, admin password, and messages
window.addEventListener('DOMContentLoaded', () => {
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

  let messages = JSON.parse(localStorage.getItem('messages') || '[]');

  function showOverlay() {
    if (errorBox) errorBox.textContent = '';
    if (infoBox) infoBox.textContent = '';
    const passField = document.getElementById('adminPassField');
    if (passField) passField.style.display = 'none';
    // Ensure the Admin option is visible when opening the modal
    if (chooseAdminBtn) chooseAdminBtn.style.display = '';
    if (overlay) overlay.classList.add('visible');
  }

  function hideOverlay() {
    if (overlay) overlay.classList.remove('visible');
  }

  function setupRole(r) {
    role = r;
    if (r === 'admin') {
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
      div.innerHTML = `\n        <div class="meta">${msg.role.toUpperCase()} - ${new Date(msg.time).toLocaleString()}</div>\n        <div>${msg.text}</div>\n      `;
      if (role === 'admin') {
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.textContent = '🗑 Delete';
        delBtn.onclick = () => {
          messages.splice(idx, 1);
          localStorage.setItem('messages', JSON.stringify(messages));
          renderMessages();
          if (infoBox) infoBox.textContent = '✔ Message deleted';
        };
        div.appendChild(delBtn);
      }
      messagesEl.appendChild(div);
    });
  }

  // Initial state: show overlay quickly if needed; defer heavy rendering work
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
      // hide the Admin button itself and show the password field
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
      messages.push(msg);
      localStorage.setItem('messages', JSON.stringify(messages));
      if (textEl) textEl.value = '';
      renderMessages();
      if (infoBox) infoBox.textContent = '✔ Message sent';
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
    renderMessages();
  });
});
