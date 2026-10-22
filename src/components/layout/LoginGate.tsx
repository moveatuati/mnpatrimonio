import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, LogIn, LogOut } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { DEMO_LOGIN, LOGIN_EVENT, isLoggedIn, logout, tryLogin } from "@/lib/demo-login";
import { UNIT } from "@/domain/config";
import "./LoginGate.css";

/** Mostra a tela de entrada até o usuário fazer login (demonstração). */
export function LoginGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  useEffect(() => {
    const sync = () => setState(isLoggedIn() ? "in" : "out");
    sync();
    window.addEventListener(LOGIN_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(LOGIN_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  if (state === "loading") return <div className="lg-page" aria-busy="true" />;
  if (state === "out") return <LoginScreen />;
  return <>{children}</>;
}

function LoginScreen() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!tryLogin(user, pass)) setErr("Usuário ou senha incorretos. Confira e tente de novo.");
  }
  return <div className="lg-page">
    <form className="lg-card" onSubmit={submit} aria-label="Entrar no sistema">
      <div className="lg-logo"><img src={BRAND.logoUrl} alt={BRAND.name} /></div>
      <p className="lg-eyebrow">Gestão de pessoas</p>
      <h1>Bem-vindo(a)</h1>
      <p className="lg-sub">Entre com seu usuário e senha para acessar o sistema da {BRAND.name}.</p>
      <label className="lg-f"><span>Usuário</span>
        <input autoComplete="username" autoCapitalize="none" value={user} onChange={e => { setUser(e.target.value); setErr(""); }} autoFocus /></label>
      <label className="lg-f"><span>Senha</span>
        <span className="lg-pass"><input type={show ? "text" : "password"} autoComplete="current-password" value={pass} onChange={e => { setPass(e.target.value); setErr(""); }} />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Esconder senha" : "Mostrar senha"}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
      {err && <p className="lg-err" role="alert">{err}</p>}
      <button className="lg-btn" type="submit" disabled={!user.trim() || !pass}><LogIn size={18} /> Entrar</button>
      <p className="lg-foot">{UNIT.unit} · {UNIT.city}</p>
    </form>
    <p className="lg-legal">{BRAND.legalName} · tecnologia MoveAtuati</p>
  </div>;
}

/** Saudação e botão Sair (rodapé do menu). */
export function LogoutBox() {
  return <div className="lg-out">
    <span>Conectado como <b>{DEMO_LOGIN.greeting}</b></span>
    <button type="button" onClick={() => { if (window.confirm("Deseja sair do sistema?")) logout(); }}><LogOut size={15} /> Sair</button>
  </div>;
}
