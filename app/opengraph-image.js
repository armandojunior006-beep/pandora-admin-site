// ============================================================================
// Imagem de preview pra quando o link é compartilhado (WhatsApp, Telegram,
// Discord, etc.) — sem isso, o WhatsApp tentava gerar uma prévia sozinho e
// mostrava um fragmento quebrado (preto + um retângulo verde), porque não
// havia NENHUMA og:image configurada (bug reportado pelo usuário 2026-08-09).
// Convenção do Next.js App Router: um arquivo chamado exatamente
// "opengraph-image.js" na pasta da rota vira automaticamente a <meta
// property="og:image"> daquela página, sem precisar declarar nada a mais.
// ============================================================================
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pandora Bot — Automação de contas e Auto Slot com Pix instantâneo";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#030404",
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(0,214,143,0.18), transparent 45%), radial-gradient(circle at 85% 80%, rgba(0,214,143,0.10), transparent 45%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              background: "#00d68f",
              boxShadow: "0 0 40px 8px rgba(0,214,143,0.55)",
            }}
          />
          <div style={{ fontSize: 26, color: "#ffffff99", fontFamily: "monospace", letterSpacing: 1 }}>
            pandora_bot
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: "#ffffff",
            maxWidth: 1000,
          }}
        >
          <div>Contas operadas</div>
          <div style={{ color: "#00d68f" }}>sem tocar no mouse.</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 28, color: "#ffffff66", maxWidth: 800 }}>
          Auto Slot, cadastro em massa e depósito Pix — 100% automático.
        </div>
      </div>
    ),
    { ...size }
  );
}
