"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal.js";

function formatDate(d) {
  if (!d) return "Vitalício";
  try { return new Date(d).toLocaleString("pt-BR"); } catch { return String(d); }
}

function isExpired(l) {
  return l.expires_at && new Date(l.expires_at).getTime() < Date.now();
}

function statusBadge(l) {
  if (l.status !== "ativo") return <span className={`badge badge-${l.status}`}>{l.status}</span>;
  if (isExpired(l)) return <span className="badge badge-expirado">vencida</span>;
  return <span className="badge badge-ativo">ativo</span>;
}

export default function LicensesClient({ initialLicenses, users, plans }) {
  const router = useRouter();
  const [licenses, setLicenses] = useState(initialLicenses);
  const [modal, setModal] = useState(null); // null | "create"
  const [form, setForm] = useState({ userId: "", planId: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  function openCreate() {
    setForm({ userId: users[0]?.id || "", planId: plans[0]?.id || "" });
    setError("");
    setModal("create");
  }

  async function refresh() {
    const res = await fetch("/api/licenses");
    const data = await res.json();
    if (data.ok) setLicenses(data.licenses);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: Number(form.userId), planId: form.planId ? Number(form.planId) : null }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error || "Falha ao gerar licença"); return; }
      setModal(null);
      await refresh();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(license, status) {
    await fetch(`/api/licenses/${license.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setStatus", status }),
    });
    await refresh();
    router.refresh();
  }

  async function renew(license) {
    const res = await fetch(`/api/licenses/${license.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "renew" }),
    });
    const data = await res.json();
    if (!data.ok) alert(data.error || "Não foi possível renovar");
    await refresh();
    router.refresh();
  }

  async function handleDelete(license) {
    if (!confirm(`Excluir esta licença? O cliente perde o acesso imediatamente.`)) return;
    await fetch(`/api/licenses/${license.id}`, { method: "DELETE" });
    await refresh();
    router.refresh();
  }

  function copyToken(license) {
    navigator.clipboard?.writeText(license.token).then(() => {
      setCopiedId(license.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div>
      <div className="toolbar">
        <div />
        <button className="btn" onClick={openCreate} disabled={!users.length}>+ Gerar licença</button>
      </div>
      {!users.length ? <p style={{ color: "var(--text-dim)" }}>Cadastre um usuário antes de gerar uma licença.</p> : null}

      <div className="card">
        {licenses.length === 0 ? (
          <div className="empty-state">Nenhuma licença gerada ainda.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Plano</th>
                <th>Token</th>
                <th>Status</th>
                <th>Expira em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((l) => (
                <tr key={l.id}>
                  <td>{l.user_name}<br /><span style={{ color: "var(--text-dim)", fontSize: 12 }}>{l.user_login}</span></td>
                  <td>{l.plan_name || "-"}</td>
                  <td>
                    <span className="token-cell">{l.token.slice(0, 14)}…</span>{" "}
                    <button className="btn-secondary" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => copyToken(l)}>
                      {copiedId === l.id ? "Copiado!" : "Copiar"}
                    </button>
                  </td>
                  <td>{statusBadge(l)}</td>
                  <td>{formatDate(l.expires_at)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {l.status === "ativo" ? (
                      <button className="btn-secondary" style={{ marginRight: 6 }} onClick={() => setStatus(l, "suspenso")}>Suspender</button>
                    ) : (
                      <button className="btn-secondary" style={{ marginRight: 6 }} onClick={() => setStatus(l, "ativo")}>Reativar</button>
                    )}
                    {l.plan_name ? <button className="btn-secondary" style={{ marginRight: 6 }} onClick={() => renew(l)}>Renovar</button> : null}
                    <button className="btn-danger" onClick={() => handleDelete(l)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal === "create" ? (
        <Modal title="Gerar nova licença" onClose={() => setModal(null)}>
          {error ? <div className="error-msg">{error}</div> : null}
          <form onSubmit={handleCreate}>
            <div className="field">
              <label>Usuário</label>
              <select className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.login})</option>)}
              </select>
            </div>
            <div className="field">
              <label>Plano (vazio = sem expiração)</label>
              <select className="input" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
                <option value="">Sem plano / vitalício</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}{p.duration_days ? ` — ${p.duration_days}d` : " — vitalício"}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? "Gerando..." : "Gerar token"}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
