/**
 * Next.js アプリケーションのメインファイル
 * 畑の水かけ当番管理システムのフロントエンド
 */

import type { AppProps } from "next/app";
import Head from "next/head";
import Layout from "../components/Layout";
import "../styles/global.css";

/**
 * アプリケーションのルートコンポーネント
 * すべてのページに共通のレイアウトを適用
 */
function MyApp({ Component, pageProps }: AppProps) {

  return (
    <>
      <Head>
        <title>Hydro-Shift</title>
        <link rel="icon" href="/icon.png" />
        <meta name="description" content="畑の水かけ当番管理システム" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}

export default MyApp; 