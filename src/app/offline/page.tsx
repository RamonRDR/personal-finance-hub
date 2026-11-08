import Link from "next/link";
export default function OfflinePage() {
  return <main className="offline"><h1>Você está offline</h1>
    <p>A interface está disponível, mas os dados não são armazenados offline.
    Reconecte-se para consultar informações atualizadas.</p>
    <Link href="/">Tentar novamente</Link></main>;
}
