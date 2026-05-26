export function PasswordStrength({ password }: { password: string }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  if (!password) return null;
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  return (
    <div className="space-y-1 mt-1.5" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : "bg-muted"}`} />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${["text-red-500", "text-orange-500", "text-yellow-600", "text-green-600"][score - 1] || "text-muted-foreground"}`}>
        {labels[score - 1] || "Enter a password"}
      </p>
    </div>
  );
}
