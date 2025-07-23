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

module.exports = withPWA({
  // 他のNext.js設定があればここに
}); 