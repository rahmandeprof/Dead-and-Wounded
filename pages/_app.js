import '../styles/globals.css';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
    return (
        <>
            <Head>
                <title>Dead & Wounded</title>
                <meta name="description" content="Classic multiplayer number guessing game" />
            </Head>
            <Component {...pageProps} />
        </>
    );
}

export default MyApp;
