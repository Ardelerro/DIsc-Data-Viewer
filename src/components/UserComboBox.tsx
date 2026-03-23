import { useState, useMemo, useRef, useEffect, type FC } from "react";
import Avatar from "./Avatar";

type UserItem = {
  key: string;
  userId?: string;
  avatarHash?: string;
  name?: string;
  total: number;
  rank: number;
};

const UserCombobox: FC<{
  users: UserItem[];
  selected: string | null;
  onChange: (val: string | null) => void;
  rankingType: "messages" | "sentiment";
}> = ({ users, selected, onChange, rankingType }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return users;
    return users.filter((u) =>
      u.name?.toLowerCase().includes(query.toLowerCase()),
    );
  }, [users, query]);

  const selectedUser = users.find((u) => u.key === selected);

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setOpen(true)}
        className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 cursor-text"
      >
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={selectedUser ? `${selectedUser.name}` : "Search users..."}
          className="w-full bg-transparent outline-none text-slate-900 dark:text-white"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-full max-h-80 overflow-y-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
          {filtered.map((user) => (
            <div
              key={user.key}
              onClick={() => {
                onChange(user.key);
                setQuery("");
                setOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition"
            >
              <Avatar
                userId={user.userId}
                avatarHash={user.avatarHash}
                username={user.name}
                className="w-8 h-8 rounded-full"
                size={64}
              />

              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {user.name}
                </div>
                <div className="text-xs text-slate-500">
                  {rankingType === "messages" ? (
                    <>#{user.rank} • {user.total.toLocaleString()} messages</>
                  ) : (
                    <>#{user.rank} • {user.total.toFixed(2)} sentiment</>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">No users found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserCombobox;