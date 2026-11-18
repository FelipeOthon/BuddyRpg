"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, Crown, Dices, Loader2, Send } from "lucide-react";
import { sendChatMessageAction } from "@/actions/chat";
import type { CampaignMemberInfo } from "@/components/campaign/CampaignWorkspaceShell";
import type { MessageRow, RollResult } from "@/types/domain";
import RollCard from "./RollCard";

const QUICK_ROLLS = [
  { label: "d20", cmd: "/r 1d20" },
  { label: "Vantagem", cmd: "/r 2d20kh1 Vantagem" },
  { label: "Desvant.", cmd: "/r 2d20kl1 Desvantagem" },
  { label: "2d6", cmd: "/r 2d6" },
  { label: "4d6kh3", cmd: "/r 4d6kh3 Atributo" },
  { label: "d%", cmd: "/r 1d%" },
];

export default function ChatPanel({
  campaignId,
  currentUserId,
  messages,
  members,
  hasMoreMessages = false,
  onLoadOlderMessages,
  onAppendMessage,
}: {
  campaignId: string;
  currentUserId: string;
  messages: MessageRow[];
  members: CampaignMemberInfo[];
  hasMoreMessages?: boolean;
  onLoadOlderMessages?: () => Promise<void>;
  onAppendMessage: (msg: MessageRow) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<number | null>(
    messages[messages.length - 1]?.id ?? null
  );

  useEffect(() => {
    const newestId = messages[messages.length - 1]?.id ?? null;
    if (newestId !== lastMsgIdRef.current) {
      lastMsgIdRef.current = newestId;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const submitMessage = (contentToSend: string) => {
    const trimmed = contentToSend.trim();
    if (!trimmed) return;
    setError(null);

    startTransition(async () => {
      const res = await sendChatMessageAction({
        campaignId,
        content: trimmed,
      });

      if (!res.ok) {
        setError(res.error ?? "Erro ao enviar mensagem.");
        return;
      }

      if (res.message) {
        onAppendMessage(res.message);
      }
      setText("");
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage(text);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Lista de Mensagens */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {hasMoreMessages && onLoadOlderMessages && (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              disabled={loadingOlder}
              onClick={async () => {
                setLoadingOlder(true);
                await onLoadOlderMessages();
                setLoadingOlder(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50"
            >
              {loadingOlder ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
              Carregar mensagens anteriores
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center">
            <Dices className="mx-auto h-7 w-7 text-zinc-600" />
            <p className="mt-2 text-xs font-medium text-zinc-300">
              Nenhuma mensagem ainda
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Envie uma mensagem ou role dados com{" "}
              <code className="font-mono text-amber-400">/r 1d20+5</code> ou{" "}
              <code className="font-mono text-amber-400">/r 4d6kh3</code>.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const author = members.find((mem) => mem.userId === m.user_id);
            const isMe = m.user_id === currentUserId;
            const isGm = author?.role === "gm";
            const roll = m.roll_result as unknown as RollResult | null;
            const timeStr = new Date(m.created_at).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={m.id}
                className={`rounded-xl border p-3 ${
                  isMe
                    ? "border-zinc-800 bg-zinc-950/90"
                    : "border-zinc-800/60 bg-zinc-950/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">
                      {author?.username ?? "Aventureiro"}
                    </span>
                    {isGm && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                        <Crown className="h-2.5 w-2.5" />
                        GM
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500">{timeStr}</span>
                </div>

                {roll ? (
                  <RollCard roll={roll} />
                ) : (
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-200">
                    {m.content}
                  </p>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Rodapé com atalhos de dados e input */}
      <div className="mt-3 border-t border-zinc-800 pt-3">
        {error && (
          <div className="mb-2.5 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] text-red-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Botões rápidos de rolagem */}
        <div className="mb-2 flex flex-wrap gap-1">
          {QUICK_ROLLS.map((q) => (
            <button
              key={q.label}
              type="button"
              disabled={isPending}
              onClick={() => submitMessage(q.cmd)}
              title={q.cmd}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[11px] font-medium text-zinc-300 transition hover:border-amber-500/50 hover:text-amber-300 disabled:opacity-50"
            >
              🎲 {q.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem ou /r 1d20+5..."
            maxLength={2000}
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={isPending || !text.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
