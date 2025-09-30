const nextConfig = {
  // 他のNext.js設定があればここに
};

// 開発環境ではPWAを無効化し、本番環境でのみ有効化する
if (process.env.NODE_ENV === 'production') {
  console.log('PWA is enabled for production.');
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    runtimeCaching: [
      // APIリクエスト用のキャッシュ戦略
      {
        urlPattern: /^https?.*/, // すべてのhttp/httpsリクエストにマッチ
        handler: 'NetworkFirst', // まずネットワークを試行し、失敗したらキャッシュを返す
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 24 * 60 * 60, // 1日
          },
          networkTimeoutSeconds: 3, // 3秒でタイムアウト
          cacheableResponse: {
            statuses: [0, 200], // 0 (Opaque Response) と 200 のみキャッシュ
          },
        },
      },
    ],
  });
  module.exports = withPWA(nextConfig);
} else {
  console.log('PWA is disabled for development.');
  module.exports = nextConfig;
}