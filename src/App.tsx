/// <reference types="chrome" />
import { useStorage } from "./hooks/useStorage";
import { sendDesktopNotification } from "./utils/notifications";
import type { NotificationItem } from "./types";

export default function App() {
  const { storage, loading, updateState } = useStorage();

  // Helper function to inject mock notifications for live UI testing
  const addMockItem = async (category: "email" | "meeting" | "teams_msg") => {
    const newItem: NotificationItem = {
      id: `mock-${Date.now()}`,
      accountId: "acc-1",
      accountEmail:
        category === "teams_msg" ? "work@company.com" : "personal@gmail.com",
      provider: category === "teams_msg" ? "microsoft" : "google",
      category,
      title:
        category === "email"
          ? "Project Update Required"
          : category === "meeting"
            ? "Sync Meeting"
            : "Direct Message in Teams",
      snippet:
        category === "email"
          ? "Please review the updated design guidelines draft."
          : category === "meeting"
            ? "Discussion on risk assessment approval workflows."
            : "Hey, do you have a quick moment for a quick check?",
      senderOrOrganizer: category === "teams_msg" ? "Svetlana" : "Krishna",
      timestamp: Date.now(),
      isUnread: true,
      deepLink:
        category === "email"
          ? "https://mail.google.com/mail/u/0/"
          : category === "meeting"
            ? "https://calendar.google.com"
            : "https://teams.microsoft.com",
    };

    // 1. Persist to storage
    await updateState((prev) => {
      const updatedItems = [newItem, ...prev.items];
      const emails = updatedItems.filter(
        (i) => i.category === "email" && i.isUnread,
      ).length;
      const meetings = updatedItems.filter(
        (i) => i.category === "meeting" && i.isUnread,
      ).length;
      const teamsMsgs = updatedItems.filter(
        (i) => i.category === "teams_msg" && i.isUnread,
      ).length;

      return {
        ...prev,
        items: updatedItems,
        unreadCounts: {
          total: emails + meetings + teamsMsgs,
          emails,
          meetings,
          teamsMsgs,
        },
      };
    });

    // 2. Trigger native OS desktop notification popup HERE
    sendDesktopNotification(newItem);
  };

  // Helper function to reset test data
  const clearAllMockData = async () => {
    await updateState((prev) => ({
      ...prev,
      items: [],
      unreadCounts: { total: 0, emails: 0, meetings: 0, teamsMsgs: 0 },
    }));
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-slate-900 text-slate-400 flex items-center justify-center text-xs font-mono">
        Loading MultiPing state...
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono px-2.5 py-0.5 rounded-full border border-indigo-500/30">
            {storage.unreadCounts.total} unread
          </span>
        </div>
      </header>

      {/* Notification List / Main Body */}
      <main className="flex-1 my-3 overflow-y-auto space-y-2 pr-1">
        {storage.items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-2 border border-slate-700 text-slate-400">
              📭
            </div>
            <h2 className="text-xs font-semibold text-slate-300">
              No Active Alerts
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click the debug controls below to test injecting mock messages.
            </p>
          </div>
        ) : (
          storage.items.map((item) => (
            <a
              key={item.id}
              href={item.deepLink}
              target="_blank"
              rel="noreferrer"
              className="block p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                  {item.category === "email"
                    ? "✉️ Email"
                    : item.category === "meeting"
                      ? "📅 Meeting"
                      : "💬 Teams"}
                </span>
                <span className="text-[10px] text-slate-500">
                  {item.accountEmail}
                </span>
              </div>
              <h3 className="text-xs font-medium text-slate-200 group-hover:text-indigo-300 truncate">
                {item.title}
              </h3>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {item.snippet}
              </p>
            </a>
          ))
        )}
      </main>

      {/* Debug Controls Footer */}
      <footer className="border-t border-slate-800 pt-3 flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => addMockItem("email")}
            className="text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-2 rounded border border-slate-700 transition"
          >
            + Email
          </button>
          <button
            onClick={() => addMockItem("meeting")}
            className="text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-2 rounded border border-slate-700 transition"
          >
            + Meeting
          </button>
          <button
            onClick={() => addMockItem("teams_msg")}
            className="text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-2 rounded border border-slate-700 transition"
          >
            + Teams
          </button>
        </div>
        <button
          onClick={clearAllMockData}
          className="text-[10px] text-red-400 hover:text-red-300 transition text-center w-full"
        >
          Clear Test Data
        </button>
      </footer>
    </div>
  );
}
