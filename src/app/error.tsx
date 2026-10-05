'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="setup-error"><h1>Let’s try that again.</h1><p>We couldn’t load this page. Your saved workout records are still safe.</p><button className="button primary" onClick={reset}>Reload page</button></main>;}
