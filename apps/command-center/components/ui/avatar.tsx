export function Avatar({ name }: { name: string }) {
  return <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700">{name.trim().slice(0, 1) || "؟"}</span>;
}
