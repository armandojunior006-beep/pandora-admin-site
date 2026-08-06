"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal.js";

function formatPrice(cents) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PlansClient({ initialPlans }) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", durationDays: "", priceCents: "", active: true });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm({ name: "", durationDays: "", priceCents: "", active: true });
    setError("");
    setModal("create");
  }

  function openEdit(plan) {
    setForm({
      name: plan.name,
      durationDays: plan.duration_days ?? "",
      priceCents: plan.price_cents,
      active: plan.active,
    });
    setError("");
    setModal(plan);
  }

  async function refresh() {
    const res = await fetch("/api/plans");
    const data = await res.json();
    if (data.ok) setPlans(data.plans);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        durationDays: form.durationDays === "" ? null : Number(form.durationDays),
        priceCents: Math.round(Number(form.priceCents || 0) * 1),
        active: form.active,
      };
      let res;
      if (modal === "create") {
        res = await fetch("/api/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        res = await fetch(`/api/plans/${modal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      const data = await res.json();
      if (!data.ok) { setError(data.error || "Falha ao salvar"); return; }
      setModal(null);
      await refresh();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(plan) {
    if (!confirm(`Excluir o plano "${plan.name}"?`)) return;
    await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
    await refresh();
    router.refresh();
  }

  return (
    <div>
      <div className="toolbar">
        <div />
        <button className="btn" onClick={openCreate}>+ Novo plano</button>
      </div>

      <div className="card">
        {plans.length === 0 ? (
          <div className="empty-state">Nenhum plano cadastrado ainda.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Duração</th>
                <th>Preço</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.duration_days ? `${p.duration_days} dias` : "Vitalício"}</td>
                  <td>{formatPrice(p.price_cents)}</td>
                  <td><span className={`badge ${p.active ? "badge-ativo" : "badge-bloqueado"}`}>{p.active ? "ativo" : "inativo"}</span></td>
                  <td>
                    <button className="btn-secondary" style={{ marginRight: 8 }} onClick={() => openEdit(p)}>Editar</button>
                    <button className="btn-danger" onClick={() => handleDelete(p)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal ? (
        <Modal title={modal === "create" ? "Novo plano" : `Editar: ${modal.name}`} onClose={() => setModal(null)}>
          {error ? <div className="error-msg">{error}</div> : null}
          <form onSubmit={handleSave}>
            <div className="field">
              <label>Nome (ex: Mensal, Semanal, Vitalício)</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Duração em dias (deixe vazio para vitalício)</label>
              <input type="number" min="1" className="input" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
            </div>
            <div className="field">
              <label>Preço (R$)</label>
              <input
                type="number" step="0.01" min="0" className="input"
                value={form.priceCents ? Number(form.priceCents) / 100 : ""}
                onChange={(e) => setForm({ ...form, priceCents: Math.round(Number(e.target.value || 0) * 100) })}
              />
            </div>
            {modal !== "create" ? (
              <div className="field">
                <label>
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} style={{ marginRight: 8 }} />
                  Plano ativo (disponível para novas licenças)
                </label>
              </div>
            ) : null}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
