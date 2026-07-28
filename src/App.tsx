export default function App() {
  return (
    <div className="w-full h-full text-slate-100 p-4 flex flex-col justify-between">
      {/* Extension Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
          <h1 className="text-base font-bold tracking-wide text-indigo-400">
            OmniPulse
          </h1>
        </div>
        <span className="text-[10px] uppercase font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
          Ready
        </span>
      </header>

      {/* Main Body Placeholder */}
      <main className="my-auto flex flex-col items-center justify-center text-center p-4">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3 border border-slate-700">
          <span className="text-xl">⚡</span>
        </div>
        <h2 className="text-sm font-semibold text-slate-200">
          No Accounts Connected
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
          Connect your Gmail, Outlook, or Teams accounts to aggregate messages
          and meetings.
        </p>
      </main>

      {/* Footer Status */}
      <footer className="text-[11px] text-slate-500 text-center border-t border-slate-800 pt-2 flex justify-between items-center">
        <span>Task 3/100 Complete</span>
        <span className="text-indigo-400 font-mono">v1.0.0</span>
      </footer>
    </div>
  );
}
