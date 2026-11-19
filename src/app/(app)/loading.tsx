export default function AppLoading() {
  return (
    <div
      className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 text-zinc-400"
      role="status"
      aria-live="polite"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-400" />
      <p className="text-xs font-medium tracking-wide">Carregando a mesa...</p>
    </div>
  );
}
