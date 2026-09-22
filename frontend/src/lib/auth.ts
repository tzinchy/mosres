const KEY = "mosres.token";
const NAME = "mosres.username";

export const getToken = () => localStorage.getItem(KEY);
export const getUsername = () => localStorage.getItem(NAME);

export function saveSession(token: string, username: string) {
  localStorage.setItem(KEY, token);
  localStorage.setItem(NAME, username);
  window.dispatchEvent(new Event("mosres.auth"));
}

export function clearSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(NAME);
  window.dispatchEvent(new Event("mosres.auth"));
}
