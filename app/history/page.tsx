"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { History as HistoryIcon, Clock, ChevronDown, ChevronUp, Trophy, ArrowRight } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { getUserAttemptsPage, type AttemptSummary } from "@/lib/quizAttempts";

function formatDuration(seconds: number | null) { if (seconds === null) return "—"; const m = Math.floor(seconds / 60); const s = seconds % 60; return m > 0 ? `${m} phút ${s} giây` : `${s} giây`; }
function formatDate(iso: string) { return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

type QuizGroup = { key: string; quizId: number | null; quizTitle: string; attempts: AttemptSummary[] };

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]); const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false); const [page, setPage] = useState(0); const [hasMore, setHasMore] = useState(false); const [expandedKey, setExpandedKey] = useState<string | null>(null);
  useEffect(() => { if (authLoading || !user) return; async function load() { setLoading(true); const { items, hasMore } = await getUserAttemptsPage(user!.id, 0); setAttempts(items); setHasMore(hasMore); setPage(0); setLoading(false); } load(); }, [authLoading, user]);
  async function handleLoadMore() { if (!user || loadingMore) return; setLoadingMore(true); const nextPage = page + 1; const { items, hasMore: more } = await getUserAttemptsPage(user.id, nextPage); setAttempts(prev => [...prev, ...items]); setHasMore(more); setPage(nextPage); setLoadingMore(false); }
  const groups = useMemo<QuizGroup[]>(() => { const map = new Map<string, QuizGroup>(); for (const a of attempts) { const key = a.quiz_id !== null ? `quiz:${a.quiz_id}` : `deleted:${a.quiz_title}`; if (!map.has(key)) map.set(key, { key, quizId: a.quiz_id, quizTitle: a.quiz_title, attempts: [] }); map.get(key)!.attempts.push(a); } return Array.from(map.values()).sort((a,b) => (b.attempts[0]?.created_at ?? "").localeCompare(a.attempts[0]?.created_at ?? "")); }, [attempts]);
  return <RequireAuth><div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 animate-fade-up">
    <div className="mb-8 flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><HistoryIcon size={24}/></div><div><p className="text-sm font-semibold text-primary">Tiến trình học tập</p><h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Lịch sử làm bài</h1><p className="mt-1 text-sm text-muted">Xem lại kết quả và theo dõi sự tiến bộ của bạn.</p></div></div>
    {authLoading || loading ? <div className="flex flex-col gap-4">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-24 rounded-2xl"/>)}</div> : groups.length === 0 ? <Card className="px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Trophy size={26}/></div><h2 className="mt-4 font-semibold text-foreground">Chưa có lịch sử</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted">Hoàn thành một bộ đề đầu tiên để kết quả và tiến trình của bạn xuất hiện ở đây.</p><Link href="/quizzes" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Khám phá bộ đề <ArrowRight size={15}/></Link></Card> : <>
      <div className="flex flex-col gap-4">{groups.map(group => { const isExpanded=expandedKey===group.key; const bestPercent=Math.max(...group.attempts.map(a=>Math.round(a.correct_count/a.total_questions*100))); const latest=group.attempts[0]; return <Card key={group.key} className="overflow-hidden rounded-2xl"><button onClick={()=>setExpandedKey(isExpanded?null:group.key)} className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-surface-muted dark:hover:bg-surface-muted/40"><div className="min-w-0"><p className="truncate font-semibold text-foreground">{group.quizTitle}{group.quizId===null&&<span className="ml-2 text-xs font-normal text-muted">(đã xoá)</span>}</p><p className="mt-1 text-xs text-muted">{group.attempts.length} lượt · Gần nhất {formatDate(latest.created_at)}</p></div><div className="flex shrink-0 items-center gap-2 sm:gap-3"><Badge variant={bestPercent>=80?"success":bestPercent>=50?"warning":"danger"}>Cao nhất {bestPercent}%</Badge>{isExpanded?<ChevronUp size={17} className="text-muted"/>:<ChevronDown size={17} className="text-muted"/>}</div></button>{isExpanded&&<div className="border-t border-gray-100 dark:border-gray-800">{group.attempts.map(a=>{const percent=Math.round(a.correct_count/a.total_questions*100);return <Link key={a.id} href={`/history/${a.id}`} className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 last:border-0 hover:bg-surface-muted dark:border-gray-800 dark:hover:bg-surface-muted/40"><div><p className="text-sm font-medium text-foreground/80">{formatDate(a.created_at)}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted"><Clock size={11}/> {formatDuration(a.time_taken_seconds)}</p></div><div className="flex items-center gap-2"><Badge variant={percent>=80?"success":percent>=50?"warning":"danger"}>{a.correct_count}/{a.total_questions} · {percent}%</Badge><ArrowRight size={15} className="text-muted"/></div></Link>})}</div>}</Card>})}</div>
      {hasMore&&<div className="mt-6 flex justify-center"><Button variant="secondary" onClick={handleLoadMore} loading={loadingMore}>{loadingMore?"Đang tải...":"Xem thêm"}</Button></div>}
    </>}
  </div></RequireAuth>;
}
