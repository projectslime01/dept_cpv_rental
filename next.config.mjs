/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3는 Node.js 네이티브 모듈(fs 등)을 사용하므로
  // 클라이언트 번들에서 제외 (서버 환경에서만 실행)
  serverExternalPackages: [
    'better-sqlite3',
    '@prisma/adapter-better-sqlite3',
  ],
};

export default nextConfig;
