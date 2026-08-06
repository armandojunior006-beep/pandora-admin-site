import LogoutButton from "./LogoutButton.js";

export default function DashboardLayout({ children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">🔒 Pandora BOT</div>
        <nav>
          <a href="/dashboard">Visão geral</a>
          <a href="/dashboard/users">Usuários</a>
          <a href="/dashboard/plans">Planos</a>
          <a href="/dashboard/licenses">Licenças / Tokens</a>
        </nav>
        <div className="logout-form">
          <LogoutButton />
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
