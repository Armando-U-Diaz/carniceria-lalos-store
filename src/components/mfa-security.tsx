"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { KeyRound, LoaderCircle, QrCode, ShieldCheck } from "lucide-react";
import { safePath } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Enrollment = { factorId: string; qrCode: string; secret: string };

function messageFor(error: unknown) {
  const message = error instanceof Error ? error.message : "No se pudo completar la verificación.";
  if (/invalid.*code|challenge.*expired|invalid.*totp/i.test(message)) return "El código no es válido o ya expiró. Intenta con el código actual.";
  return message;
}

export function MfaSecurity({ isAdmin, requestedNext }: { isAdmin: boolean; requestedNext?: string }) {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]).then(([factors, assurance]) => {
      if (!active) return;
      if (factors.error || assurance.error) setError(messageFor(factors.error || assurance.error));
      else {
        setFactorId(factors.data.totp[0]?.id || null);
        setCurrentLevel(assurance.data.currentLevel);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function startEnrollment() {
    setWorking(true);
    setError("");
    setSuccess("");
    const supabase = createClient();
    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) {
      setError(messageFor(factors.error));
      setWorking(false);
      return;
    }
    for (const factor of factors.data.all.filter((item: { factor_type: string; status: string }) => item.factor_type === "totp" && item.status === "unverified")) {
      const removal = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (removal.error) {
        setError(messageFor(removal.error));
        setWorking(false);
        return;
      }
    }
    const result = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: isAdmin ? "Administración Lalo's" : "Cuenta Lalo's",
      issuer: "Carnicería Lalo's",
    });
    if (result.error) setError(messageFor(result.error));
    else setEnrollment({ factorId: result.data.id, qrCode: result.data.totp.qr_code, secret: result.data.totp.secret });
    setWorking(false);
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanCode = code.replace(/\s/g, "");
    const selectedFactor = enrollment?.factorId || factorId;
    if (!selectedFactor || !/^\d{6}$/.test(cleanCode)) {
      setError("Escribe el código de 6 dígitos de tu aplicación autenticadora.");
      return;
    }
    setWorking(true);
    setError("");
    setSuccess("");
    const supabase = createClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId: selectedFactor });
    if (challenge.error) {
      setError(messageFor(challenge.error));
      setWorking(false);
      return;
    }
    const verification = await supabase.auth.mfa.verify({
      factorId: selectedFactor,
      challengeId: challenge.data.id,
      code: cleanCode,
    });
    if (verification.error) {
      setError(messageFor(verification.error));
      setWorking(false);
      return;
    }
    setEnrollment(null);
    setFactorId(selectedFactor);
    setCurrentLevel("aal2");
    setCode("");
    setSuccess("Verificación en dos pasos confirmada. Tu sesión está protegida.");
    setWorking(false);
    // A full navigation guarantees that the server reads the new AAL2 session
    // written by Supabase before it evaluates the protected admin route.
    window.location.replace(safePath(requestedNext ?? null, "/perfil"));
  }

  const qrSource = enrollment ? safeQrDataUrl(enrollment.qrCode) : "";

  if (loading) return <div className="mfa-loading"><LoaderCircle className="spin" size={19} /> Revisando protecci&oacute;n...</div>;

  return <div className={`mfa-panel ${isAdmin ? "required" : ""}`}>
    <div className="mfa-status">
      <span><ShieldCheck size={18} /></span>
      <div>
        <strong>{currentLevel === "aal2" ? "Sesión con doble verificación" : factorId ? "Falta verificar esta sesión" : "Verificación en dos pasos no configurada"}</strong>
        <p>{isAdmin ? "Es obligatoria para abrir o modificar el panel administrativo. Solo tendrás que escribir el código al iniciar una sesión nueva." : "Es opcional y protege tu cuenta aunque alguien descubra tu contraseña."}</p>
      </div>
    </div>

    {error && <p className="form-message error" role="alert">{error}</p>}
    {success && <p className="form-message success" role="status">{success}</p>}

    {!factorId && !enrollment && <button className="button secondary" type="button" onClick={startEnrollment} disabled={working}>
      {working ? <LoaderCircle className="spin" size={17} /> : <QrCode size={17} />} {isAdmin ? "Activar acceso seguro al panel" : "Configurar con una app"}
    </button>}

    {enrollment && <div className="mfa-enrollment">
      <p>1. Escanea este QR con Google Authenticator, Microsoft Authenticator o una app compatible.</p>
      <Image className="mfa-qr" src={qrSource} width={220} height={220} unoptimized alt="Código QR para configurar verificación en dos pasos" />
      <details><summary>No puedo escanear el QR</summary><p>Escribe esta clave manualmente en tu aplicaci&oacute;n:</p><code>{enrollment.secret}</code></details>
      <p>2. Escribe el c&oacute;digo de 6 d&iacute;gitos que aparece en la aplicaci&oacute;n.</p>
    </div>}

    {(enrollment || (factorId && currentLevel !== "aal2")) && <form className="mfa-form" onSubmit={verifyCode}>
      <label htmlFor="mfa-code">C&oacute;digo de seguridad</label>
      <div><input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" required /><button className="button primary" disabled={working}>{working ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} Verificar</button></div>
    </form>}
  </div>;
}

function safeQrDataUrl(source: string) {
  const separator = source.indexOf(",");
  const payload = source.startsWith("data:image/svg+xml") && separator >= 0
    ? source.slice(separator + 1)
    : source;

  let svg = payload;
  if (!payload.trimStart().startsWith("<")) {
    try { svg = decodeURIComponent(payload); } catch { svg = payload; }
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
