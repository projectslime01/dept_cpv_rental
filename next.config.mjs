/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3는 Node.js 네이티브 모듈(fs 등)을 사용하므로
  // 서버 컴포넌트에서 번들링하지 않고 Node.js require()로 처리
  // (Next.js 14: experimental.serverComponentsExternalPackages)
  experimental: {
    serverComponentsExternalPackages: [
      'better-sqlite3',
      '@prisma/adapter-better-sqlite3',
    ],
  },
};

export default nextConfig;
