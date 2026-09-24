import Link from "next/link";
export default function NotFound() { return <main className="container-site flex min-h-screen flex-col justify-center gap-5"><h1 className="text-5xl">404</h1><p>Không tìm thấy trang bạn yêu cầu.</p><Link href="/" className="underline">Về trang chủ</Link></main>; }
