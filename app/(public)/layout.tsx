// Passthrough — layout is handled per-locale in [locale]/layout.tsx
export default function PublicGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
