/**
 * Login de DEMONSTRAÇÃO (sem banco de dados): um usuário e uma senha fixos, verificados no navegador.
 * Serve só para a apresentação ao cliente — não é segurança de verdade.
 * Na fase com Supabase, troca por login real (cada pessoa com o seu usuário).
 */
export const DEMO_LOGIN = { user: "mnpatrimonios", password: "MN@2026", greeting: "MN Patrimônios" } as const;
export const LOGIN_KEY = "mn-login-demo-v1";
export const LOGIN_EVENT = "mn-login-change";

export function isLoggedIn(): boolean {
  try { return window.localStorage.getItem(LOGIN_KEY) === "ok"; } catch { return false; }
}
export function tryLogin(user: string, password: string): boolean {
  const ok = user.trim().toLowerCase() === DEMO_LOGIN.user && password === DEMO_LOGIN.password;
  if (ok) {
    try { window.localStorage.setItem(LOGIN_KEY, "ok"); } catch { /* sessão sem memória */ }
    window.dispatchEvent(new Event(LOGIN_EVENT));
  }
  return ok;
}
export function logout(): void {
  try { window.localStorage.removeItem(LOGIN_KEY); } catch { /* ok */ }
  window.dispatchEvent(new Event(LOGIN_EVENT));
}
