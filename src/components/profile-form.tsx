"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import type { Profile } from "@/types/domain";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, phone }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No pudimos guardar tus datos.");
      setMessage("Tus datos se guardaron correctamente.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No pudimos guardar tus datos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="profile-form" onSubmit={submit}>
      <label>Nombre completo<input required minLength={3} maxLength={120} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
      <label>Teléfono<input inputMode="tel" autoComplete="tel" maxLength={20} placeholder="55 1234 5678" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}
      <button className="button primary" disabled={saving}><Save size={17} /> {saving ? "Guardando…" : "Guardar cambios"}</button>
    </form>
  );
}
