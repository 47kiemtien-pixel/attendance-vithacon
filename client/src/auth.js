const TOKEN_KEY = 'attendance_auth_token';
const USER_KEY = 'attendance_auth_user';
const AUTH_EVENT = 'attendance-auth-changed';

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function getStoredUser() {
  return safeJsonParse(localStorage.getItem(USER_KEY));
}

export function persistAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, {
    detail: { token, user }
  }));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, {
    detail: { token: '', user: null }
  }));
}

export function subscribeAuthSession(listener) {
  function handle(event) {
    listener(event.detail || { token: '', user: null });
  }

  window.addEventListener(AUTH_EVENT, handle);
  return () => window.removeEventListener(AUTH_EVENT, handle);
}
