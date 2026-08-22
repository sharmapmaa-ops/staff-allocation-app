/**
 * Thin fetch wrapper around the backend REST API.
 * Automatically attaches the Bearer session token (if present) and
 * parses/throws JSON error bodies so callers can just try/catch.
 */
const Api = (() => {
  function base() { return window.APP_CONFIG.API_BASE; }
  function token() { return localStorage.getItem('sa_token'); }

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers['Authorization'] = 'Bearer ' + t;

    let res;
    try {
      res = await fetch(base() + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw new Error('Could not reach the server. Please check your connection and try again.');
    }

    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body is fine */ }

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('sa_token');
        localStorage.removeItem('sa_user');
        if (!location.pathname.endsWith('login.html')) {
          location.href = 'login.html';
        }
      }
      const message = (data && data.error) || `Request failed (${res.status})`;
      throw new Error(message);
    }
    return data;
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    del: (path) => request('DELETE', path),
  };
})();
