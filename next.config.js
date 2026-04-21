/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 환경변수 공개 설정 (NEXT_PUBLIC_ 접두사만 클라이언트 노출)
  env: {
    NEXT_PUBLIC_APP_URL:            process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY: process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY,
  },
  // Playwright 서버 컴포넌트에서만 사용
  serverExternalPackages: ['playwright'],
}

module.exports = nextConfig
