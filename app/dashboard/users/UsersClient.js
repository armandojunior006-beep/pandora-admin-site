"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal.js";

function formatDate(d) {
  if (!d) return "-";
  try { return new Date(d).toLocaleString("pt-BR"); } catch { return String(d); }
}

export default function UsersClient({ initialUsers }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [modal, setModal] = useState(null); // null | "create" | user object (edit)
  const [form, setForm] = useState({ name: "", login: "", contact: "", notes: "", status: "ativo" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm({ name: "", login: "", contact: "", notes: "", status: "ativo" });
    setError("");
    setModal("create");
  }

  function openEdit(user) {
    setForm({ name: user.name, login: user.login, contact: user.contact || "", notes: user.notes || "", status: user.status });
    setError("");
    setModal(user);
  }

  async function refresh() {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (data.ok) setUsers(data.users);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      let res;
      if (modal === "create") {
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch(`/api/users/${modal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
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

  async function handleDelete(user) {
    if (!confirm(`Excluir o usuário "${user.name}"? Isso também remove as licenças dele.`)) return;
    await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    await refresh();
    router.refresh();
  }

  return (
    <div>
      <div className="toolbar">
        <div />
        <button className="btn" onClick={openCreate}>+ Novo usuário</button>
      </div>

      <div className="card">
        {users.length === 0 ? (
          <div className="empty-state">Nenhum usuário cadastrado ainda.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Login</th>
                <th>Contato</th>
                <th>Status</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="mono">{u.login}</td>
                  <td>{u.contact || "-"}</td>
                  <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>
                    <button className="btn-secondary" style={{ marginRight: 8 }} onClick={() => openEdit(u)}>Editar</button>
                    <button className="btn-danger" onClick={() => handleDelete(u)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal ? (
        <Modal title={modal === "create" ? "Novo usuário" : `Editar: ${modal.name}`} onClose={() => setModal(null)}>
          {error ? <div className="error-msg">{error}</div> : null}
          <form onSubmit={handleSave}>
            <div className="field">
              <label>Nome</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Login (usado no bot)</label>
              <input
                className="input"
                required
                disabled={modal !== "create"}
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Contato (WhatsApp/e-mail)</label>
              <input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            {modal !== "create" ? (
              <div className="field">
                <label>Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="ativo">Ativo</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
            ) : null}
            <div className="field">
              <label>Notas</label>
              <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
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
