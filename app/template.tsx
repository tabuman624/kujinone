// app/template.tsx — runs on every route change. Mount key changes → anim-page replays.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="anim-page">{children}</div>;
}
