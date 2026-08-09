"use client";

import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getPublicEnv, hasSupabaseEnv } from "@/lib/env";
import { safePath } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register" | "reset" | "update";
const modes: Mode[] = ["login", "register", "reset", "update"];

export function AuthForm() {
  const params = useSearchParams();
  const router = useRouter();
  const requestedMode = params.get("mode") as Mode | null;
  const initialMode: Mode = requestedMode && modes.includes(requestedMode) ? requestedMode : "login";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"form" | "google" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);
  const configured = hasSupabaseEnv();
  const next = safePath(params.get("next"), "/perfil");

  useEffect(() => {
    if (!configured) return;
    const env = getPublicEnv();
    const controller = new AbortController();
    fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((settings: { external?: { google?: boolean } }) => setGoogleEnabled(Boolean(settings.external?.google)))
      .catch(() => setGoogleEnabled(null));
    return () => controller.abort();
  }, [configured]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!configured) return;
    setLoading("form"); setError(""); setMessage("");
    const supabase = createClient();
    try {
      if (mode === "login") {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        router.push(next); router.refresh();
      } else if (mode === "register") {
        const passwordError = validatePassword(password);
        if (passwordError) throw new Error(passwordError);
        const result = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
        if (result.error) throw result.error;
        if (result.data.session) { router.push(next); router.refresh(); }
        else setMessage("Revisa tu correo para confirmar la cuenta. Después podrás iniciar sesión.");
      } else if (mode === "reset") {
        const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/auth?mode=update` });
        if (result.error) throw result.error;
        setMessage("Te enviamos un enlace para crear una contraseña nueva.");
      } else {
        const passwordError = validatePassword(password);
        if (passwordError) throw new Error(passwordError);
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        setMessage("Tu contraseña se actualizó. Ya puedes continuar.");
        window.setTimeout(() => router.push(next), 900);
      }
    } catch (authError) {
      setError(authError instanceof Error ? translateAuthError(authError.message) : "No pudimos completar la solicitud.");
    } finally { setLoading(null); }
  };

  const googleLogin = async () => {
    if (!configured) return;
    setLoading("google"); setError(""); setMessage("");
    const supabase = createClient();
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) throw oauthError;
      if (!data.url) throw new Error("Google no está disponible en este momento.");
      window.location.assign(data.url);
    } catch (oauthError) {
      setError(oauthError instanceof Error ? translateAuthError(oauthError.message) : "No pudimos iniciar con Google.");
      setLoading(null);
    }
  };

  const title = mode === "register" ? "Crea tu cuenta" : mode === "reset" ? "Recupera tu acceso" : mode === "update" ? "Nueva contraseña" : "Qué gusto verte";
  const subtitle = mode === "login" ? "Entra para comprar y seguir tus pedidos." : mode === "register" ? "Guarda tus datos y compra con mayor facilidad." : "Te ayudamos a volver a tu cuenta.";

  return (
    <div className="auth-card">
      <Link href="/" className="brand auth-brand"><span className="brand-mark">L</span><span className="brand-copy"><strong>Lalo&apos;s</strong><small>Carnicería fina</small></span></Link>
      <div className="auth-heading"><p className="eyebrow"><span /> Mi cuenta</p><h1>{title}</h1><p>{subtitle}</p></div>
      {!configured && <div className="config-notice"><strong>Modo demostración</strong><p>La autenticación estará disponible al configurar las variables de Supabase indicadas en <code>.env.example</code>.</p></div>}
      {params.get("notice") === "config" && configured && <p className="form-error">Inicia sesión para continuar.</p>}
      {params.get("notice") === "cart" && <p className="form-error" role="alert">Inicia sesión para elegir la cantidad y agregar productos al carrito.</p>}
      {params.get("notice") === "signed-out" && <p className="form-success" role="status">Tu sesión se cerró correctamente.</p>}
      {params.get("error") === "callback" && <p className="form-error" role="alert">El enlace de acceso expiró o no pudo validarse. Intenta nuevamente.</p>}
      {params.get("error") === "oauth" && <p className="form-error" role="alert">Google canceló o rechazó el acceso. Puedes intentarlo otra vez.</p>}
      <form onSubmit={submit} className="auth-form">
        {mode === "register" && <label>Nombre completo<div className="input-with-icon"><UserRound size={18} /><input required minLength={3} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></div></label>}
        {mode !== "update" && <label>Correo electrónico<div className="input-with-icon"><Mail size={18} /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>}
        {mode !== "reset" && <label>{mode === "update" ? "Nueva contraseña" : "Contraseña"}<div className="input-with-icon"><LockKeyhole size={18} /><input required minLength={mode === "login" ? 1 : 10} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}
        {mode === "login" && <button className="text-link align-right" type="button" onClick={() => setMode("reset")}>Olvidé mi contraseña</button>}
        {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
        <button className="button primary wide" disabled={Boolean(loading) || !configured}>{loading === "form" ? "Un momento…" : mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : mode === "reset" ? "Enviar enlace" : "Guardar contraseña"}</button>
      </form>
      {(mode === "login" || mode === "register") && <><div className="auth-separator"><span /> o continúa con <span /></div><button className="google-button" onClick={googleLogin} disabled={!configured || Boolean(loading) || googleEnabled === false}><GoogleIcon /> {loading === "google" ? "Conectando…" : googleEnabled === null ? "Comprobar acceso con Google" : "Continuar con Google"}</button>{googleEnabled === false && <p className="provider-note">Google estará disponible cuando terminemos de conectar las credenciales de la carnicería.</p>}</>}
      <div className="auth-switch">{mode === "login" ? <>¿Aún no tienes cuenta? <button onClick={() => setMode("register")}>Regístrate</button></> : mode === "register" ? <>¿Ya tienes cuenta? <button onClick={() => setMode("login")}>Inicia sesión</button></> : <button onClick={() => setMode("login")}>Volver al inicio de sesión</button>}</div>
    </div>
  );
}

function translateAuthError(message: string) {
  if (message.includes("Invalid login credentials")) return "El correo o la contraseña no coinciden.";
  if (message.includes("already registered")) return "Este correo ya tiene una cuenta.";
  if (message.includes("Password should")) return "La contraseña debe tener al menos 10 caracteres e incluir mayúscula, minúscula, número y símbolo.";
  if (message.includes("provider is not enabled") || message.includes("Unsupported provider")) return "El acceso con Google aún no está habilitado. Intenta con correo mientras terminamos la configuración.";
  return message;
}

function validatePassword(password: string) {
  if (password.length < 10) return "Usa al menos 10 caracteres.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return "Incluye mayúsculas y minúsculas.";
  if (!/\d/.test(password)) return "Incluye al menos un número.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Incluye al menos un símbolo.";
  return "";
}

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9.1L6.4 14Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.9.6 4 1.6l2.7-2.7A9.1 9.1 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>;
}
