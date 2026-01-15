import '../styles/globals.css';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
    return (
        <>
            <Head>
                <title>Dead and Wounded</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
                <meta name="description" content="Multiplayer number guessing game" />
            </Head>
            <Component {...pageProps} />
        </>
    );
}
