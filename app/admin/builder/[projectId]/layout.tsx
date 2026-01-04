'use client';

// This layout removes the admin sidebar for the builder workspace
// to give full width for the editor, preview, and file tree panels
export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950">
      {children}
    </div>
  );
}
