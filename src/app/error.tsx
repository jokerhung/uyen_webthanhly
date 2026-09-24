"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="container-site flex min-h-screen flex-col justify-center gap-5"><h1 className="text-3xl">Đã xảy ra lỗi</h1><p>Vui lòng thử lại sau.</p><button onClick={reset} className="w-fit border border-border px-5 py-3">Thử lại</button></main>; }
