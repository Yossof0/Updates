
// Clean, single-file JS for role selection, admin password, groups and messages
window.addEventListener('DOMContentLoaded', () => {
  // Elements
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
  const createGroupBtn = document.getElementById('createGroupBtn');
  const joinGroupBtn = document.getElementById('joinGroupBtn');
  const groupsListEl = document.getElementById('groupsList');
  const activeGroupNameEl = document.getElementById('activeGroupName');
  const activeGroupCodeEl = document.getElementById('activeGroupCode');

  // State
  let role = localStorage.getItem('role');
  let adminId = localStorage.getItem('adminId');
  if (!adminId) { adminId = 'ADM-' + Math.random().toString(36).slice(2,9).toUpperCase(); localStorage.setItem('adminId', adminId); }
  let activeGroup = null;
  let activeGroupOwnerId = null;
  let messages = [];
  let joinedGroups = JSON.parse(localStorage.getItem('joinedGroups') || '[]');
  // dedupe joined groups in case of accidental duplicates
  joinedGroups = Array.from(new Set(joinedGroups));
  localStorage.setItem('joinedGroups', JSON.stringify(joinedGroups));

  // Firebase Realtime DB (optional)
  let useRealtimeDB = false;
  let realtimeDB = null;
  let groupsRef = null;
  let groupMessagesListener = null;

  if (window.FIREBASE_CONFIG && typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps || firebase.apps.length === 0) firebase.initializeApp(window.FIREBASE_CONFIG);
      if (firebase.database) {
        realtimeDB = firebase.database();
        groupsRef = realtimeDB.ref('groups');
        useRealtimeDB = true;
        if (infoBox) infoBox.textContent = 'Realtime DB connected';
      }
    } catch (e) { console.warn('Firebase init failed', e); }
  }

  function showOverlay() { if (errorBox) errorBox.textContent = ''; if (infoBox) infoBox.textContent = ''; if (overlay) overlay.classList.add('visible'); }
  function hideOverlay() { if (overlay) overlay.classList.remove('visible'); }

  function setupRole(r) {
    role = r;
    if (createGroupBtn) createGroupBtn.style.display = (role === 'admin') ? '' : 'none';
    // Recompute composer visibility based on current role and active group ownership
    if (composerBox) {
      if (!activeGroup) {
        composerBox.style.display = 'none';
      } else {
        const isOwner = (role === 'admin' && activeGroupOwnerId && activeGroupOwnerId === adminId) || (!useRealtimeDB && checkIfAdminOwnsGroup(activeGroup));
        composerBox.style.display = (role === 'admin' && isOwner) ? 'flex' : 'none';
      }
    }
    // If the new role is not admin, hide message content immediately
    if (role !== 'admin') {
      // clear active group and header
      activeGroup = null;
      activeGroupOwnerId = null;
      if (activeGroupNameEl) activeGroupNameEl.textContent = 'Select a group';
      if (activeGroupCodeEl) activeGroupCodeEl.textContent = '';
      // hide composer and clear messages
      if (composerBox) composerBox.style.display = 'none';
      messages = [];
      if (messagesEl) messagesEl.innerHTML = '';
    }
    renderGroups();
  }

  function makeGVC() { const a = Math.random().toString(36).slice(2,8).toUpperCase(); const b = Math.random().toString(36).slice(2,6).toUpperCase(); return a + '-' + b; }

  // Groups rendering
  function renderGroups() {
    if (!groupsListEl) return;
    groupsListEl.innerHTML = '';
    // Collect all unique group GVCs: owned + joined, deduped
    let groupGVCs = new Set();
    let ownedGroups = [];
    let joinedButNotOwned = [];
    if (role === 'admin') {
      if (useRealtimeDB && groupsRef) {
        groupsRef.orderByChild('ownerId').equalTo(adminId).once('value').then(snap => {
          const data = snap.val() || {};
          ownedGroups = Object.keys(data).map(k => ({ gvc: k, ...data[k] }));
          ownedGroups.forEach(g => groupGVCs.add(g.gvc));
          // Add joined groups that are not owned
          joinedButNotOwned = joinedGroups.filter(gvc => !groupGVCs.has(gvc));
          // Render owned groups
          ownedGroups.forEach(g => {
            const wrap = document.createElement('div'); wrap.className = 'group-item';
            const info = document.createElement('div'); info.className = 'group-info';
            const title = document.createElement('div'); title.className = 'group-title'; title.textContent = g.name || g.gvc;
            const code = document.createElement('div'); code.className = 'group-code'; code.textContent = g.gvc;
            info.appendChild(title); info.appendChild(code);
            const actions = document.createElement('div'); actions.className = 'group-actions';
            const openBtn = document.createElement('button'); openBtn.textContent = 'Open'; openBtn.onclick = () => enterGroup(g.gvc);
            const del = document.createElement('button'); del.textContent = 'Delete'; del.onclick = () => {
              groupsRef.child(g.gvc).remove().then(()=>{
                try { realtimeDB.ref('groupMessages/'+g.gvc).remove(); } catch(e){}
                // Remove from joinedGroups for current user
                joinedGroups = joinedGroups.filter(x=>x!==g.gvc);
                localStorage.setItem('joinedGroups', JSON.stringify(joinedGroups));
                renderGroups();
                if (activeGroup===g.gvc){ activeGroup=null; if(activeGroupNameEl) activeGroupNameEl.textContent='Select a group'; if(activeGroupCodeEl) activeGroupCodeEl.textContent=''; messages=[]; renderMessages(); if (composerBox) composerBox.style.display = 'none'; }
                if (infoBox) infoBox.textContent = 'Group deleted: ' + g.gvc;
              }).catch(()=>{ if (errorBox) errorBox.textContent = 'Delete failed'; });
            };
            actions.appendChild(openBtn); actions.appendChild(del);
            wrap.appendChild(info); wrap.appendChild(actions); groupsListEl.appendChild(wrap);
          });
          // Render joined but not owned groups
          joinedButNotOwned.forEach(gvc => {
            const wrap = document.createElement('div'); wrap.className='group-item';
            const info = document.createElement('div'); info.className='group-info';
            const title = document.createElement('div'); title.className='group-title'; title.textContent = 'Loading...';
            const code = document.createElement('div'); code.className='group-code'; code.textContent = gvc;
            info.appendChild(title); info.appendChild(code);
            const actions = document.createElement('div'); actions.className='group-actions';
            const openBtn = document.createElement('button'); openBtn.textContent='Open'; openBtn.onclick = () => enterGroup(gvc);
            const leave = document.createElement('button'); leave.textContent='Leave'; leave.onclick = () => { joinedGroups = joinedGroups.filter(x=>x!==gvc); localStorage.setItem('joinedGroups', JSON.stringify(joinedGroups)); renderGroups(); if (activeGroup===gvc){ activeGroup=null; if(activeGroupNameEl) activeGroupNameEl.textContent='Select a group'; if(activeGroupCodeEl) activeGroupCodeEl.textContent=''; messages=[]; renderMessages(); if (composerBox) composerBox.style.display='none'; } if (infoBox) infoBox.textContent = 'Left group: ' + gvc; };
            actions.appendChild(openBtn); actions.appendChild(leave); wrap.appendChild(info); wrap.appendChild(actions); groupsListEl.appendChild(wrap);
            // populate name
            if (useRealtimeDB && groupsRef) {
              groupsRef.child(gvc).once('value').then(snap => { const gg = snap.val(); if (gg && gg.name) title.textContent = gg.name; else title.textContent = 'Group ' + gvc; }).catch(()=>{ title.textContent = 'Group ' + gvc; });
            } else { const local = JSON.parse(localStorage.getItem('localGroups') || '{}'); if (local[gvc] && local[gvc].name) title.textContent = local[gvc].name; else title.textContent = 'Group ' + gvc; }
          });
        });
      } else {
        const local = JSON.parse(localStorage.getItem('localGroups') || '{}');
        ownedGroups = Object.keys(local).filter(k => local[k].ownerId === adminId).map(k => ({ gvc: k, ...local[k] }));
        ownedGroups.forEach(g => groupGVCs.add(g.gvc));
        joinedButNotOwned = joinedGroups.filter(gvc => !groupGVCs.has(gvc));
        ownedGroups.forEach(g => {
          const wrap=document.createElement('div'); wrap.className='group-item';
          const info=document.createElement('div'); info.className='group-info';
          const title=document.createElement('div'); title.className='group-title'; title.textContent=g.name||g.gvc;
          const code=document.createElement('div'); code.className='group-code'; code.textContent=g.gvc; info.appendChild(title); info.appendChild(code);
          const actions=document.createElement('div'); actions.className='group-actions';
          const openBtn=document.createElement('button'); openBtn.textContent='Open'; openBtn.onclick=()=>enterGroup(g.gvc);
          const del=document.createElement('button'); del.textContent='Delete'; del.onclick=()=>{ delete local[g.gvc]; localStorage.setItem('localGroups', JSON.stringify(local)); joinedGroups = joinedGroups.filter(x=>x!==g.gvc); localStorage.setItem('joinedGroups', JSON.stringify(joinedGroups)); renderGroups(); if (infoBox) infoBox.textContent = 'Group deleted: ' + g.gvc; };
          actions.appendChild(openBtn); actions.appendChild(del); wrap.appendChild(info); wrap.appendChild(actions); groupsListEl.appendChild(wrap);
        });
        joinedButNotOwned.forEach(gvc => {
          const wrap=document.createElement('div'); wrap.className='group-item';
          const info=document.createElement('div'); info.className='group-info';
          const title=document.createElement('div'); title.className='group-title'; title.textContent='Loading...';
          const code=document.createElement('div'); code.className='group-code'; code.textContent=gvc; info.appendChild(title); info.appendChild(code);
          const actions=document.createElement('div'); actions.className='group-actions';
          const openBtn=document.createElement('button'); openBtn.textContent='Open'; openBtn.onclick=()=>enterGroup(gvc);
          const leave=document.createElement('button'); leave.textContent='Leave'; leave.onclick=()=>{ joinedGroups = joinedGroups.filter(x=>x!==gvc); localStorage.setItem('joinedGroups', JSON.stringify(joinedGroups)); renderGroups(); };
          actions.appendChild(openBtn); actions.appendChild(leave); wrap.appendChild(info); wrap.appendChild(actions); groupsListEl.appendChild(wrap);
          if (local[gvc] && local[gvc].name) title.textContent = local[gvc].name; else title.textContent = 'Group ' + gvc;
        });
      }
    } else {
      // user view: joinedGroups with Leave — show stored group name when available
      joinedGroups.forEach(gvc => {
        if (groupGVCs.has(gvc)) return; groupGVCs.add(gvc);
        const wrap = document.createElement('div'); wrap.className='group-item';
        const info = document.createElement('div'); info.className='group-info';
        const title = document.createElement('div'); title.className='group-title'; title.textContent = 'Loading...';
        const code = document.createElement('div'); code.className='group-code'; code.textContent = gvc;
        info.appendChild(title); info.appendChild(code);
        const actions = document.createElement('div'); actions.className='group-actions';
        const openBtn = document.createElement('button'); openBtn.textContent='Open'; openBtn.onclick = () => enterGroup(gvc);
        // single leave button (hide composer when leaving)
        const leave = document.createElement('button');
        leave.textContent = 'Leave';
        leave.onclick = () => {
          joinedGroups = joinedGroups.filter(x=>x!==gvc);
          localStorage.setItem('joinedGroups', JSON.stringify(joinedGroups));
          renderGroups();
          if (activeGroup===gvc){
            activeGroup=null;
            if(activeGroupNameEl) activeGroupNameEl.textContent='Select a group';
            if(activeGroupCodeEl) activeGroupCodeEl.textContent='';
            messages=[];
            renderMessages();
            if (composerBox) composerBox.style.display='none';
          }
          if (infoBox) infoBox.textContent = 'Left group: ' + gvc;
        };
        actions.appendChild(openBtn); actions.appendChild(leave); wrap.appendChild(info); wrap.appendChild(actions); groupsListEl.appendChild(wrap);

        // populate the friendly name: try Realtime DB first, then local storage
        if (useRealtimeDB && groupsRef) {
          groupsRef.child(gvc).once('value').then(snap => {
            const g = snap.val();
            if (g && g.name) title.textContent = g.name; else title.textContent = 'Group ' + gvc;
          }).catch(()=>{ title.textContent = 'Group ' + gvc; });
        } else {
          const local = JSON.parse(localStorage.getItem('localGroups') || '{}');
          if (local[gvc] && local[gvc].name) title.textContent = local[gvc].name; else title.textContent = 'Group ' + gvc;
        }
      });
    }
  }

  // Enter a group: fetch owner, attach messages listener
  function enterGroup(gvc){
    activeGroup = gvc;
    activeGroupOwnerId = null;
    // show immediate UI: GVC under the name and a loading label until we fetch the real name
    if (activeGroupNameEl) activeGroupNameEl.textContent = 'Loading...';
    if (activeGroupCodeEl) activeGroupCodeEl.textContent = gvc;

    const finalizeEnter = () => {
      // show composer only if admin and owner
      const isOwner = (role==='admin' && activeGroupOwnerId && activeGroupOwnerId===adminId) || (!useRealtimeDB && checkIfAdminOwnsGroup(gvc));
      if (composerBox) composerBox.style.display = (role==='admin' && isOwner) ? 'flex' : 'none';
    };

    if (useRealtimeDB && groupsRef) {
      // fetch owner first, then attach listener
      groupsRef.child(gvc).once('value').then(snap=>{
        const g = snap.val();
        if (g){
          activeGroupOwnerId = g.ownerId || null;
          if (activeGroupNameEl) activeGroupNameEl.textContent = g.name || ('Group ' + gvc);
        } else {
          if (activeGroupNameEl) activeGroupNameEl.textContent = 'Group ' + gvc;
        }
        // attach listener
        try { if (groupMessagesListener && typeof groupMessagesListener.off==='function') groupMessagesListener.off(); } catch(e){}
        const ref = realtimeDB.ref('groupMessages/' + gvc);
        groupMessagesListener = ref;
        ref.on('value', snap2=>{ const data = snap2.val() || {}; messages = Object.keys(data).map(k=>Object.assign({_id:k}, data[k])); messages.sort((a,b)=>(a.time||0)-(b.time||0)); renderMessages(); });
      }).finally(() => { finalizeEnter(); });
    } else {
  const local = JSON.parse(localStorage.getItem('localGroups') || '{}');
  if (local[gvc] && local[gvc].name){ if(activeGroupNameEl) activeGroupNameEl.textContent = local[gvc].name; activeGroupOwnerId = local[gvc].ownerId || null; }
  else { if (activeGroupNameEl) activeGroupNameEl.textContent = 'Group ' + gvc; }
      messages = JSON.parse(localStorage.getItem('group:' + gvc) || '[]'); renderMessages();
      finalizeEnter();
    }
  }

  function checkIfAdminOwnsGroup(gvc){ if (role !== 'admin') return false; const local = JSON.parse(localStorage.getItem('localGroups') || '{}'); return local[gvc] && local[gvc].ownerId === adminId; }

  // Render messages as bubbles; admins who own the group can delete
  function renderMessages(){
    if (!messagesEl) return; messagesEl.innerHTML = '';
  const ownerIsAdmin = (role==='admin' && activeGroup && activeGroupOwnerId && activeGroupOwnerId===adminId);
    messages.forEach(msg => {
      const wrap = document.createElement('div');
      const bubble = document.createElement('div'); bubble.className = 'bubble ' + ((msg.role==='admin') ? 'admin' : 'user');
      const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = ((msg.role||'user').toUpperCase()) + ' - ' + (msg.time ? new Date(msg.time).toLocaleString() : '');
      const content = document.createElement('div'); content.className = 'bubble-text'; content.textContent = msg.text;
      bubble.appendChild(meta); bubble.appendChild(content); wrap.appendChild(bubble);
      if (ownerIsAdmin){
        const del = document.createElement('button'); del.className='bubble-del'; del.setAttribute('aria-label','Delete message'); del.title = 'Delete message'; del.innerHTML = '🗑'; del.onclick = ()=>{
          if (!activeGroup) { if (errorBox) errorBox.textContent='No group selected'; return; }
          // If message has an _id (from Realtime DB) remove by id
          if (useRealtimeDB && realtimeDB && msg._id){
            realtimeDB.ref('groupMessages/' + activeGroup + '/' + msg._id).remove().then(()=>{ if (infoBox) infoBox.textContent='✔ Message deleted'; }).catch(()=>{ if (errorBox) errorBox.textContent='Delete failed'; });
            return;
          }
          // Local fallback: find by time+text
          const key = 'group:' + activeGroup;
          const arr = JSON.parse(localStorage.getItem(key)||'[]');
          const idx = arr.findIndex(x=>x.time===msg.time && x.text===msg.text);
          if (idx>=0){ arr.splice(idx,1); localStorage.setItem(key, JSON.stringify(arr)); messages=arr; renderMessages(); if (infoBox) infoBox.textContent='✔ Message deleted'; }
        };
        wrap.appendChild(del);
      }
      messagesEl.appendChild(wrap);
    });
  }

  // Create group (input-driven)
  // Prompt modal elements
  const promptOverlay = document.getElementById('promptOverlay');
  const promptTitle = document.getElementById('promptTitle');
  const promptInput = document.getElementById('promptInput');
  const promptConfirm = document.getElementById('promptConfirm');
  const promptCancel = document.getElementById('promptCancel');
  const promptHint = document.getElementById('promptHint');

  function showPrompt(title, placeholder, initial) {
    if (!promptOverlay) return Promise.reject();
    promptTitle.textContent = title || 'Input';
    promptInput.placeholder = placeholder || '';
    promptInput.value = initial || '';
    promptHint.textContent = '';
    promptOverlay.style.display = 'flex';
    promptInput.focus();
    return new Promise((resolve) => {
      const onConfirm = () => { hidePrompt(); resolve(promptInput.value.trim()); };
      const onCancel = () => { hidePrompt(); resolve(null); };
      promptConfirm.onclick = onConfirm;
      promptCancel.onclick = onCancel;
      promptInput.onkeydown = (e) => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel(); };
    });
  }

  function hidePrompt(){ if (!promptOverlay) return; promptOverlay.style.display = 'none'; promptConfirm.onclick = null; promptCancel.onclick = null; promptInput.onkeydown = null; }

  if (createGroupBtn) createGroupBtn.addEventListener('click', async ()=>{
    const name = await showPrompt('Create group', 'Group name');
    if (!name) { if (infoBox) infoBox.textContent = '⚠ Group creation cancelled'; return; }
    const gvc = makeGVC(); const groupObj = { name, ownerId: adminId, created: Date.now() };
    if (useRealtimeDB && groupsRef){ groupsRef.child(gvc).set(groupObj).then(()=>{ if (infoBox) infoBox.textContent='✔ Group created: '+gvc; renderGroups(); }).catch(()=>{ if (errorBox) errorBox.textContent='Create failed'; }); }
    else { const lg = JSON.parse(localStorage.getItem('localGroups')||'{}'); lg[gvc]=groupObj; localStorage.setItem('localGroups', JSON.stringify(lg)); if (infoBox) infoBox.textContent='✔ Group created: '+gvc; renderGroups(); }
  });

  // Join group (modal-driven)
  if (joinGroupBtn) joinGroupBtn.addEventListener('click', async ()=>{
    const gvc = await showPrompt('Join group', 'Enter GVC');
    if (!gvc) { if (infoBox) infoBox.textContent = '⚠ Join cancelled'; return; }
    if (useRealtimeDB && groupsRef) {
      groupsRef.child(gvc).once('value').then(snap => {
        if (!snap.exists()) { if (errorBox) errorBox.textContent = 'Group not found'; return; }
        if (!joinedGroups.includes(gvc)) {
          joinedGroups.push(gvc);
          localStorage.setItem('joinedGroups', JSON.stringify(joinedGroups));
        }
        renderGroups();
        // Always enter group after join (for both admin and user)
        enterGroup(gvc);
      }).catch(() => { if (errorBox) errorBox.textContent = 'Lookup failed'; });
    } else {
      const local = JSON.parse(localStorage.getItem('localGroups') || '{}');
      if (!local[gvc]) { if (errorBox) errorBox.textContent = 'Group not found (local)'; return; }
      if (!joinedGroups.includes(gvc)) {
        joinedGroups.push(gvc);
        localStorage.setItem('joinedGroups', JSON.stringify(joinedGroups));
      }
      renderGroups();
      enterGroup(gvc);
    }
  });

  // Send message (only inside group; composer visible only to admin owner)
  if (sendBtn) sendBtn.addEventListener('click', ()=>{
    const textEl = document.getElementById('textInput'); const text = textEl ? textEl.value.trim() : '';
    if (!text) { if (infoBox) infoBox.textContent='⚠ Please write something before sending'; return; }
    if (!activeGroup) { if (infoBox) infoBox.textContent='⚠ Select a group first'; return; }
    const effectiveRole = role || 'user'; const msg = { text, role: effectiveRole, time: Date.now() };
    if (useRealtimeDB && realtimeDB){ const ref = realtimeDB.ref('groupMessages/' + activeGroup).push(); ref.set(msg).then(()=>{ if (infoBox) infoBox.textContent='✔ Message sent'; if (textEl) textEl.value=''; }).catch(err=>{ if (errorBox) errorBox.textContent = 'Send failed: ' + (err && err.message ? err.message : 'unknown'); }); }
    else { const key = 'group:' + activeGroup; const arr = JSON.parse(localStorage.getItem(key)||'[]'); arr.push(msg); localStorage.setItem(key, JSON.stringify(arr)); messages=arr; if (textEl) textEl.value=''; renderMessages(); if (infoBox) infoBox.textContent='✔ Message sent'; }
  });

  // Role modal handlers
  if (changeRoleBtn) changeRoleBtn.addEventListener('click', ()=>{ localStorage.removeItem('role'); role=null; showOverlay(); setupRole(null); });
  if (chooseUserBtn) chooseUserBtn.addEventListener('click', ()=>{ localStorage.setItem('role','user'); setupRole('user'); hideOverlay(); });
  if (chooseAdminBtn) chooseAdminBtn.addEventListener('click', ()=>{ chooseAdminBtn.style.display='none'; const passField=document.getElementById('adminPassField'); if (passField) passField.style.display='block'; if (adminPassEl){ adminPassEl.value=''; adminPassEl.focus(); } });
  if (confirmAdminBtn) confirmAdminBtn.addEventListener('click', ()=>{ const pass = adminPassEl ? adminPassEl.value : ''; if (pass === 'admin1012'){ localStorage.setItem('role','admin'); setupRole('admin'); hideOverlay(); } else { if (errorBox) errorBox.textContent='❌ Wrong password'; } });

  // initial render
  renderGroups();
  if (!role) showOverlay(); else setupRole(role);

  // cleanup on unload
  window.addEventListener('beforeunload', ()=>{ if (useRealtimeDB && groupMessagesListener){ try { groupMessagesListener.off(); } catch(e){} } });
});
