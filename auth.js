(function(){
  const usersKey = 'et.users.v1';
  const currentKey = 'et.currentUser.v1';

  async function sha256(text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function loadUsers(){
    try { return JSON.parse(localStorage.getItem(usersKey) || '{}'); } catch(_) { return {}; }
  }
  function saveUsers(map){ localStorage.setItem(usersKey, JSON.stringify(map)); }
  function setCurrent(username){ localStorage.setItem(currentKey, JSON.stringify({ username })); }
  function getCurrent(){ try { const v = JSON.parse(localStorage.getItem(currentKey)||'null'); return v && v.username; } catch(_) { return null; } }
  function logout(){ localStorage.removeItem(currentKey); location.href = 'login.html'; }

  window.Auth = {
    getCurrent,
    logout,
    async register(username, password){
      const u = String(username||'').trim();
      const p = String(password||'');
      if (!u || !p) throw new Error('Missing fields');
      const users = loadUsers();
      if (users[u]) throw new Error('User already exists');
      users[u] = { passHash: await sha256(p) };
      saveUsers(users);
      setCurrent(u);
    },
    async login(username, password){
      const u = String(username||'').trim();
      const p = String(password||'');
      const users = loadUsers();
      const record = users[u];
      if (!record) throw new Error('Invalid credentials');
      const ok = record.passHash === await sha256(p);
      if (!ok) throw new Error('Invalid credentials');
      setCurrent(u);
    }
  };
})();

