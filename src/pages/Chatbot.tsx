import React, { useState, useRef, useEffect } from "react"
import { Send, Bot, Sparkles, AlertCircle } from "lucide-react"
import { cn } from "../utils"
import MarkdownRenderer from "../components/MarkdownRenderer"
import {
  StudentProfileState,
  DegreePlanPayload,
  ChatMessage,
  BACKEND_API_URL,
  BACKEND_STREAM_URL,
  sanitizeErrorMessage,
  QUICK_PROMPTS,
} from "../components/chatbot/chatService"
import DegreePlanActionCard from "../components/chatbot/DegreePlanActionCard"

export type { DegreePlanPayload } from "../components/chatbot/chatService"

interface ChatbotProps {
  onApplyPlan?: (payload: DegreePlanPayload) => void
}

export default function Chatbot({ onApplyPlan }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      role: "assistant",
      content:
        "Halo! Saya **Compass AI**, asisten akademik pintar di FTMM Universitas Airlangga. 🧭\n\nSaya dapat membantu Anda menyusun **Rencana Studi (Study Planner)** yang dipersonalisasi sesuai minat karir dan aturan prasyarat kurikulum FTMM.\n\nAda yang bisa saya bantu hari ini?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<StudentProfileState>({
    program_studi: null,
    semester_saat_ini: null,
    riwayat_matkul_lulus: [],
    minat_fokus: [],
    target_kelulusan_semester: 8,
    maks_sks_per_semester: 24,
    is_confirmed_by_user: false,
  })
  const [appliedPlanId, setAppliedPlanId] = useState<string | null>(null)
  const [backendStatus, setBackendStatus] = useState<{
    status?: string
    service?: string
    ollama_online?: boolean
    chatbot_service_online?: boolean
    chatbot_model?: string
    ollama?: {
      online?: boolean
      host?: string
      default_model?: string
    }
  } | null>(null)

  useEffect(() => {
    fetch("/api/v1/health")
      .then((res) =>
        res.ok ? res.json() : fetch("/api/health").then((r) => r.json()),
      )
      .then((data) => {
        if (data) setBackendStatus(data)
      })
      .catch(() => {})
  }, [])

  const endOfMessagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input
    if (!textToSend.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
    }

    const assistantMsgId = `assistant-${Date.now()}`
    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
    }

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage])
    if (!messageText) setInput("")
    setIsLoading(true)

    try {
      const streamRes = await fetch(BACKEND_STREAM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          student_profile: profile,
        }),
      })

      if (streamRes.ok && streamRes.body) {
        const reader = streamRes.body.getReader()
        const decoder = new TextDecoder()
        let accumulatedContent = ""
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith("data:")) continue
            const jsonStr = trimmed.replace(/^data:\s*/, "")
            try {
              const data = JSON.parse(jsonStr) as {
                token?: string
                done?: boolean
                reply?: string
                error?: { code?: string message?: string }
                updated_profile?: StudentProfileState
                plan_payload?: DegreePlanPayload
                action_type?: string
                routing_mode?: string
                latency_ms?: number
              }

              if (data.error) {
                accumulatedContent = `⚠️ **Layanan Tidak Tersedia**\n\n${data.error.message || "Gagal memproses permintaan."}`
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content: accumulatedContent,
                          action_type: "GENERAL",
                        }
                      : m,
                  ),
                )
                return
              }

              if (data.token) {
                accumulatedContent += data.token
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: accumulatedContent }
                      : m,
                  ),
                )
              }

              if (data.done) {
                if (
                  data.reply &&
                  (!accumulatedContent ||
                    accumulatedContent.length < data.reply.length)
                ) {
                  accumulatedContent = data.reply
                }
                if (data.updated_profile) {
                  setProfile(data.updated_profile)
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content: accumulatedContent,
                          plan_payload: data.plan_payload,
                          action_type: data.action_type || "GENERAL",
                          routing_mode: data.routing_mode,
                          latency_ms: data.latency_ms,
                        }
                      : m,
                  ),
                )
              }
            } catch {}
          }
        }
        return
      }

      // Standard non-streaming fallback
      const fallbackRes = await fetch(BACKEND_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          student_profile: profile,
        }),
      })

      if (fallbackRes.ok) {
        const data = await fallbackRes.json()
        if (data.updated_profile) setProfile(data.updated_profile)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: data.reply,
                  plan_payload: data.plan_payload,
                  action_type: data.action_type,
                  routing_mode: data.routing_mode,
                  latency_ms: data.latency_ms,
                }
              : m,
          ),
        )
      } else {
        const errorData = (await fallbackRes.json().catch(() => null)) as {
          error?: { code?: string message?: string }
          detail?: string
        } | null
        const detail =
          errorData?.error?.message ||
          sanitizeErrorMessage(errorData?.detail) ||
          "Gagal memproses pesan. Pastikan layanan backend dan microservice aktif."
        const isRetry =
          fallbackRes.status === 503 ||
          errorData?.error?.code === "upstream_service_unavailable"
        const retryNote = isRetry
          ? "\n\n*Layanan AI sedang inisialisasi. Silakan ulangi dalam beberapa saat.*"
          : ""
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `⚠️ **Layanan Tidak Tersedia (${fallbackRes.status})**\n\n${detail}${retryNote}`,
                  action_type: "GENERAL",
                }
              : m,
          ),
        )
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content:
                  "⚠️ **Koneksi Terputus**\n\nTidak dapat terhubung ke server FTMM Compass AI. Pastikan backend Gateway (`pnpm dev:backend`) dan kontainer Docker Chatbot (`ftmm-compass-chatbot`) telah aktif.",
                action_type: "GENERAL",
              }
            : m,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyPlanToVisualRoadmap = (
    msgId: string,
    payload: DegreePlanPayload,
  ) => {
    if (onApplyPlan) {
      onApplyPlan(payload)
      setAppliedPlanId(msgId)
    }
  }

  return (
    <div className="h-full flex flex-col bg-surface border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-4 border-b border-border bg-navy text-white flex justify-between items-center relative overflow-hidden flex-shrink-0">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-gold/20 rounded-full blur-3xl" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold border border-gold/40">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base flex items-center gap-2">
              FTMM Compass AI
              <Sparkles className="w-4 h-4 text-gold" />
            </h3>
            <p className="text-xs text-teal-light font-mono">
              Academic Advisor & Study Planner Engine
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              backendStatus?.chatbot_service_online
                ? "bg-teal animate-pulse"
                : "bg-warning animate-pulse",
            )}
          />
          <span className="text-xs font-mono text-white/80">
            {backendStatus?.chatbot_service_online
              ? `Live • ${backendStatus.chatbot_model || "Hybrid Engine"}`
              : "Rule Engine Fallback"}
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background/30">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 max-w-[85%] md:max-w-[75%]",
              msg.role === "user" ? "ml-auto flex-row-reverse" : "",
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm font-bold text-xs",
                msg.role === "user"
                  ? "bg-teal text-navy-dark"
                  : "bg-navy text-gold border border-gold/30",
              )}
            >
              {msg.role === "user" ? "ME" : "AI"}
            </div>

            <div className="flex flex-col gap-2 max-w-full">
              <div
                className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                  msg.role === "user"
                    ? "bg-teal text-navy-dark rounded-tr-none font-medium"
                    : "bg-surface border border-border text-foreground rounded-tl-none",
                )}
              >
                <MarkdownRenderer
                  content={msg.content}
                  isUser={msg.role === "user"}
                />
              </div>

              {msg.role === "assistant" &&
                (msg.routing_mode || msg.latency_ms !== undefined) && (
                  <div className="flex items-center gap-2 text-[10px] text-muted font-mono px-1">
                    {msg.routing_mode && (
                      <span className="bg-navy/5 px-1.5 py-0.5 rounded border border-navy/10 text-navy font-bold">
                        Mode: {msg.routing_mode}
                      </span>
                    )}
                    {msg.latency_ms !== undefined && (
                      <span className="text-muted">
                        Latency: {Math.round(msg.latency_ms)}ms
                      </span>
                    )}
                  </div>
                )}

              {/* Interactive Degree Plan Action Card */}
              {msg.plan_payload && (
                <DegreePlanActionCard
                  messageId={msg.id}
                  payload={msg.plan_payload}
                  isApplied={appliedPlanId === msg.id}
                  onApplyPlan={handleApplyPlanToVisualRoadmap}
                />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[80%] animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm text-xs font-bold">
              AI
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-border text-foreground rounded-tl-none shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse delay-150" />
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse delay-300" />
              <span className="text-xs text-muted font-mono ml-2">
                Memvalidasi kurikulum & menyusun rencana...
              </span>
            </div>
          </div>
        )}

        <div ref={endOfMessagesRef} />
      </div>

      {/* Suggested Quick Prompts */}
      {messages.length <= 2 && (
        <div className="px-6 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-t border-border bg-background/50 flex-shrink-0">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(prompt)}
              className="px-3 py-1.5 bg-surface border border-border hover:border-gold hover:text-navy text-xs rounded-full whitespace-nowrap text-muted transition-all shadow-2xs cursor-pointer flex-shrink-0"
            >
              💡 {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-surface border-t border-border flex-shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ketik pertanyaan atau permintaan rencana studi Anda..."
            className="w-full pl-4 pr-12 py-3 bg-background border border-border rounded-xl focus:border-gold focus:ring-1 focus:ring-gold outline-hidden text-sm font-sans transition-all"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-navy text-gold rounded-lg hover:bg-navy-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted text-center mt-2 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3 text-gold" />
          Rencana studi yang dihasilkan divalidasi langsung oleh aturan
          prasyarat kurikulum FTMM UNAIR.
        </p>
      </div>
    </div>
  )
}
