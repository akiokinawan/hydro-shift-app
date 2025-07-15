/**
 * Next.js アプリケーションのメインファイル
 * 畑の水かけ当番管理システムのフロントエンド
 */

import type { AppProps } from "next/app";
import Layout from "../components/Layout";
import "../styles/global.css";

/**
 * アプリケーションのルートコンポーネント
 * すべてのページに共通のレイアウトを適用
 */
function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp; 