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
        ],
      },
    ];
  },
};

module.exports = nextConfig;
