/* ============================================================
   auth.js — Login Supabase, perfil de admin e gestão de usuários
   ============================================================ */
(function () {
  'use strict';

  const URL = 'https://dtdyibtmgprmgnhrgcou.supabase.co';
  const KEY = 'sb_publishable_yP5Xn0iufcNlX9T4_MM3vg_8ExcJSCl';

  let client = null;
  let session = null;
  let profile = null;
  let listeners = [];

  function translate(message) {
    const m = String(message || 'Erro desconhecido.');
    const map = {
      'Invalid login credentials': 'E-mail ou senha incorretos.',
      'Email not confirmed': 'E-mail ainda não confirmado. Confira sua caixa de entrada.',
      'User not found': 'Usuário não encontrado.',
      'Password should be at least 6 characters': 'A senha deve ter ao menos 6 caracteres.',
      'New password should be different from the old password.': 'A nova senha deve ser diferente da anterior.',
      'Access denied.': 'Acesso negado: você não tem permissão para realizar esta ação.',
      'Failed to fetch': 'Não foi possível conectar ao servidor. Verifique sua internet.'
    };
    return map[m] || m;
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(Auth); } catch (e) { console.error(e); } });
  }

  async function loadProfile() {
    if (!session) { profile = null; return false; }
    const result = await client.from('profiles')
      .select('id, email, full_name, role, active')
      .eq('id', session.user.id)
      .maybeSingle();
    if (result.error) throw new Error(translate(result.error.message));
    const p = result.data;
    if (!p || p.role !== 'admin' && p.role !== 'user' || !p.active) { profile = null; return false; }
    profile = p;
    return true;
  }

  const Auth = {
    get ready() { return !!profile && !!session; },
    get isAdmin() { return !!profile && profile.role === 'admin'; },
    get isUser() { return !!profile && profile.role === 'user'; },
    get userId() { return session ? session.user.id : ''; },
    get userName() { return profile ? profile.full_name : ''; },
    get session() { return session; },
    get user() { return session ? session.user : null; },
    get profile() { return profile; },

    onChange(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },

    async init() {
      if (!window.supabase || !window.supabase.createClient) {
        throw new Error('Biblioteca de autenticação não carregou. Recarregue a página.');
      }
      client = window.supabase.createClient(URL, KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      client.auth.onAuthStateChange(function (event, s) {
        session = s || null;
        if (!session || event === 'SIGNED_OUT') {
          profile = null;
          notify();
          return;
        }
        // notifica somente depois de validar o perfil ativo
        loadProfile().then(notify).catch(notify);
      });
      const result = await client.auth.getSession();
      session = result.data.session || null;
      if (!session) { profile = null; return false; }
      return loadProfile();
    },

    async getToken() {
      if (!client) return '';
      const result = await client.auth.getSession();
      return (result.data.session && result.data.session.access_token) || '';
    },

    async signIn(email, password) {
      const result = await client.auth.signInWithPassword({ email: email.trim(), password: password });
      if (result.error) throw new Error(translate(result.error.message));
      session = result.data.session;
      const ok = await loadProfile();
      if (!ok) {
        await client.auth.signOut();
        session = null;
        throw new Error('Este e-mail não possui um perfil ativo. Procure um administrador.');
      }
      notify();
      return true;
    },

    async signOut() {
      await client.auth.signOut();
      session = null;
      profile = null;
      notify();
    },

    async rpc(name, params) {
      const result = await client.rpc(name, params || {});
      if (result.error) throw new Error(translate(result.error.message));
      return result.data;
    },

    listUsers() { return Auth.rpc('admin_list_users'); },
    createUser(data) { return Auth.rpc('admin_create_user', data); },
    updateUser(data) { return Auth.rpc('admin_update_user', data); },
    deleteUser(id) { return Auth.rpc('admin_delete_user', { p_id: id }); },

    async changePassword(password) {
      const result = await client.auth.updateUser({ password: password });
      if (result.error) throw new Error(translate(result.error.message));
      return true;
    }
  };

  window.Auth = Auth;
})();
