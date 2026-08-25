/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Segurança 2026-08-18: sem isso a página de login/dashboard podia ser
  // embutida num <iframe> de outro site (clickjacking) — nega qualquer
  // frame de fora.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Segurança 2026-08-25 (headers adicionais — só de resposta, não
          // alteram corpo/status, então não afetam o bot nem o update):
          // impede MIME-sniffing (evita interpretar resposta como script/html).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // não vaza a URL completa (com querystring) pra sites externos.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // desliga APIs de dispositivo que o painel não usa.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          // força HTTPS por 1 ano (Vercel já é sempre HTTPS — sem 'preload'
          // pra não travar em lista permanente).
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
