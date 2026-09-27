export function LoginForm({ error }: { error?: string }) {
  const messages: Record<string, string> = {
    invalid: "Không thể đăng nhập. Vui lòng kiểm tra tài khoản và mật khẩu.",
    origin: "Tên miền đăng nhập chưa được máy chủ cho phép.",
    rate: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.",
    service: "Máy chủ tạm thời không khả dụng. Vui lòng thử lại.",
  };
  return <form action="/api/admin/session" method="post" className="grid gap-4 rounded border border-neutral-200 bg-white p-6 shadow-sm">
    <label className="grid gap-1 text-sm font-semibold">Email hoặc tài khoản local<input name="email" required maxLength={320} autoComplete="username" type="text" className="rounded border p-2 font-normal" /></label>
    <label className="grid gap-1 text-sm font-semibold">Mật khẩu<input name="password" required maxLength={1024} autoComplete="current-password" type="password" className="rounded border p-2 font-normal" /></label>
    <button type="submit" className="rounded bg-neutral-900 p-3 font-semibold text-white">Đăng nhập</button>
    {error && messages[error] && <p role="alert" className="text-sm text-red-700">{messages[error]}</p>}
  </form>;
}
