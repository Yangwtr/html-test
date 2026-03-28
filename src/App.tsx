import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

// ✅ 最小可用版：三光寶貝 AI 訓練基地（單檔原型）
// 1) 上傳詩詞百寶箱檔（示意：只顯示檔名）
// 2) 上傳 Excel(.xlsx/.xls) 匯入 Q&A（欄位：intent, question, answer）
// 3) 手動新增 Q&A → 草稿
// 4) 教師審核：草稿 → 已審核
// 5) 互動問答：只用已審核題庫回答（相似度匹配示意）
//
// ⚠️ 這不是「真的訓練模型」，只是把已審核資料做搜尋與匹配。

type QAStatus = "draft" | "approved";

type QA = {
  id: string;
  intent: string;
  question: string;
  answer: string;
  status: QAStatus;
};

const REQUIRED = ["intent", "question", "answer"] as const;

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function safeTrim(v: any) {
  return String(v ?? "").trim();
}

function normalizeKey(k: string) {
  // 避免 regex，保持 canmore replacement 安全 & 讓程式更短
  return k
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_")
    .replaceAll("　", "_"); // 全形空白
}

function tokenize(s: string) {
  // 中英混合簡易 token：英文用非字母數字切分；中文用「字」做 token
  const t = safeTrim(s);
  if (!t) return [] as string[];
  const en = t.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
  const zh = Array.from(t).filter((ch) => ch >= "一" && ch <= "鿿");
  return [...en, ...zh];
}

function similarity(a: string, b: string) {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

function confidence(score: number) {
  if (score >= 0.55) return "高";
  if (score >= 0.35) return "中";
  return "低";
}

function SelfTests() {
  // 極簡自測（開發模式）
  if (typeof process !== "undefined" && (process as any).env?.NODE_ENV === "development") {
    console.assert(similarity("春曉 作者", "春曉的作者是誰") > 0.2, "similarity basic");
    console.assert(similarity("", "abc") === 0, "similarity empty");
    console.assert(confidence(0.6) === "高", "confidence 高");
    console.assert(confidence(0.4) === "中", "confidence 中");
    console.assert(confidence(0.1) === "低", "confidence 低");
  }
  return null;
}

function Mascot({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 flex items-end gap-3">
      {text ? (
        <div className="relative max-w-[260px] rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/90 shadow-lg backdrop-blur">
          {text}
          {/* bubble tail (border + fill) */}
          <div className="absolute -bottom-2 right-8 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-white/10" />
          <div className="absolute -bottom-[7px] right-8 h-0 w-0 border-x-7 border-x-transparent border-t-7 border-t-black/60" />
        </div>
      ) : null}

      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/5 shadow">
        <img
          src="/sanguang-baobei.png"
          alt="三光寶貝"
          className="h-14 w-14 object-contain animate-bounce"
          style={{ animationDuration: "2.2s" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    </div>
  );
}

export default function App() {
  // 詩詞百寶箱檔（示意）
  const [poemFile, setPoemFile] = useState<File | null>(null);

  // 題庫（草稿 + 已審核）
  const [qas, setQas] = useState<QA[]>([]);

  // Excel 匯入
  const [excelName, setExcelName] = useState<string>("");
  const [excelPreview, setExcelPreview] = useState<QA[]>([]);
  const [excelErrors, setExcelErrors] = useState<string[]>([]);

  // 手動新增
  const [draft, setDraft] = useState({ intent: "poem_query", question: "", answer: "" });

  // 互動問答
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<
    { id: string; role: "user" | "bot"; text: string; meta?: any }[]
  >([]);

  // 三光寶貝對話框文字（在互動問答區顯示）
  const [mascotText, setMascotText] = useState("先審核通過一些題目，我才能回答喔！");

  const approved = useMemo(() => qas.filter((q) => q.status === "approved"), [qas]);

  const stats = useMemo(() => {
    const total = qas.length;
    const ok = approved.length;
    const draftCount = total - ok;
    const passRate = total ? Math.round((ok / total) * 100) : 0;
    return { total, ok, draftCount, passRate };
  }, [qas.length, approved.length]);

  // 沒對話時，給三光寶貝一個引導提示
  useEffect(() => {
    if (chatLog.length > 0) return;
    setMascotText(
      approved.length > 0 ? "嗨！你可以問我詩詞問題～" : "先審核通過一些題目，我才能回答喔！"
    );
  }, [approved.length, chatLog.length]);

  async function onExcel(file: File) {
    setExcelErrors([]);
    setExcelName(file.name);
    setExcelPreview([]);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];

      const normalized = raw.map((r) => {
        const out: any = {};
        for (const [k, v] of Object.entries(r)) out[normalizeKey(String(k))] = v;
        return out;
      });

      const missing = REQUIRED.filter((c) => !normalized.some((r) => c in r));
      if (missing.length) {
        setExcelErrors([`缺少必要欄位：${missing.join("、")}`]);
        return;
      }

      const rows: QA[] = normalized
        .filter((r) => Object.values(r).some((v) => safeTrim(v) !== ""))
        .map((r) => ({
          id: uid("qa"),
          intent: safeTrim(r.intent),
          question: safeTrim(r.question),
          answer: safeTrim(r.answer),
          status: "draft" as const,
        }));

      const rowErrs = rows
        .map((r, i) => {
          const miss = REQUIRED.filter((c) => !safeTrim((r as any)[c]));
          return miss.length ? `第 ${i + 2} 列缺少：${miss.join("、")}` : null;
        })
        .filter(Boolean) as string[];

      setExcelPreview(rows);
      setExcelErrors(rowErrs.slice(0, 8));
    } catch {
      setExcelErrors(["解析失敗：請確認檔案為 .xlsx / .xls"]);
    }
  }

  function importExcelToDrafts() {
    if (!excelPreview.length) return;

    setQas((prev) => {
      const merged = [...excelPreview, ...prev];
      const seen = new Set<string>();
      const out: QA[] = [];
      for (const r of merged) {
        const key = `${safeTrim(r.intent)}|${safeTrim(r.question)}|${safeTrim(r.answer)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
      }
      return out;
    });

    setExcelPreview([]);
    setExcelName("");
  }

  function addManualQA() {
    const miss = REQUIRED.filter((c) => !safeTrim((draft as any)[c]));
    if (miss.length) {
      alert(`請先補齊：${miss.join("、")}`);
      return;
    }

    setQas((prev) => [
      {
        id: uid("qa"),
        intent: safeTrim(draft.intent),
        question: safeTrim(draft.question),
        answer: safeTrim(draft.answer),
        status: "draft",
      },
      ...prev,
    ]);

    setDraft((d) => ({ ...d, question: "", answer: "" }));
  }

  function approve(id: string) {
    setQas((prev) => prev.map((q) => (q.id === id ? { ...q, status: "approved" } : q)));
  }

  function removeQA(id: string) {
    setQas((prev) => prev.filter((q) => q.id !== id));
  }

  function findBest(query: string) {
    let best: { qa: QA; score: number } | null = null;
    for (const qa of approved) {
      const s = similarity(query, qa.question);
      if (!best || s > best.score) best = { qa, score: s };
    }
    return best;
  }

  function sendChat() {
    const q = safeTrim(chatInput);
    if (!q) return;

    // 先顯示「思考中」
    setMascotText("嗯嗯…我想一下…");

    setChatLog((prev) => [...prev, { id: uid("m"), role: "user", text: q }]);
    setChatInput("");

    const best = findBest(q);
    if (!best || best.score < 0.28) {
      const t = "我還不會這題～請到左側『手動新增 Q&A』補上正確答案，再到中間按『通過審核』！";
      setMascotText(t);
      setChatLog((prev) => [...prev, { id: uid("m"), role: "bot", text: t, meta: { kind: "unknown" } }]);
      return;
    }

    const t = best.qa.answer;
    setMascotText(t);
    setChatLog((prev) => [
      ...prev,
      {
        id: uid("m"),
        role: "bot",
        text: t,
        meta: {
          kind: "answer",
          confidence: confidence(best.score),
          score: Math.round(best.score * 100),
          intent: best.qa.intent,
          matchedQuestion: best.qa.question,
        },
      },
    ]);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SelfTests />

      <header className="border-b border-white/10 bg-black/50">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
            <img
              src="/sanguang-baobei.png"
              alt="三光寶貝"
              className="h-10 w-10 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="flex-1">
            <div className="text-sm text-white/60">三光國小｜AI 訓練平台（最小版原型）</div>
            <div className="text-xl font-semibold">三光寶貝 AI 訓練基地</div>
          </div>
          <div className="hidden md:flex gap-4 text-sm text-white/70">
            <div>總題數：{stats.total}</div>
            <div>已審核：{stats.ok}</div>
            <div>通過率：{stats.passRate}%</div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 md:grid-cols-3">
        {/* 左：上傳 + 新增 */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-base font-semibold">① 上傳與新增</h2>

          <div className="mt-4">
            <div className="text-sm text-white/70">詩詞百寶箱（電子檔）</div>
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => setPoemFile(e.target.files?.[0] ?? null)}
            />
            <div className="mt-2 text-xs text-white/60">
              {poemFile ? `已選擇：${poemFile.name}` : "尚未上傳"}
            </div>
          </div>

          <hr className="my-4 border-white/10" />

          <div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/70">Excel 匯入 Q&A</div>
              <div className="text-xs text-white/50">intent / question / answer</div>
            </div>

            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onExcel(f);
                e.currentTarget.value = "";
              }}
            />

            <div className="mt-2 text-xs text-white/60">
              {excelName ? `已讀取：${excelName}` : "尚未匯入"}
            </div>

            {excelErrors.length > 0 && (
              <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-xs text-amber-100">
                {excelErrors.map((e, i) => (
                  <div key={i}>• {e}</div>
                ))}
              </div>
            )}

            {excelPreview.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-white/70">預覽前 5 筆</div>
                <div className="mt-1 space-y-1 text-xs text-white/75">
                  {excelPreview.slice(0, 5).map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/10 bg-black/30 p-2">
                      <div className="text-white/60">[{r.intent}]</div>
                      <div>Q: {r.question}</div>
                      <div className="text-white/70">A: {r.answer}</div>
                    </div>
                  ))}
                </div>
                <button
                  className="mt-2 w-full rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
                  onClick={importExcelToDrafts}
                >
                  將 Excel 匯入草稿（{excelPreview.length} 筆）
                </button>
              </div>
            )}
          </div>

          <hr className="my-4 border-white/10" />

          <div>
            <div className="text-sm text-white/70">手動新增 Q&A（草稿）</div>
            <div className="mt-2 grid gap-2">
              <input
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                value={draft.intent}
                onChange={(e) => setDraft((d) => ({ ...d, intent: e.target.value }))}
                placeholder="intent（例如：poem_query / author / meaning）"
              />
              <textarea
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                value={draft.question}
                onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
                placeholder="question（問題）"
                rows={3}
              />
              <textarea
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                value={draft.answer}
                onChange={(e) => setDraft((d) => ({ ...d, answer: e.target.value }))}
                placeholder="answer（答案）"
                rows={3}
              />
              <button
                className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
                onClick={addManualQA}
              >
                新增到草稿
              </button>
            </div>
          </div>
        </section>

        {/* 中：審核 */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-base font-semibold">② 教師審核</h2>
          <div className="mt-2 text-sm text-white/70">
            草稿：{stats.draftCount}｜已審核：{stats.ok}
          </div>

          <div className="mt-4 space-y-2">
            {qas.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                先從左側匯入 Excel 或手動新增。
              </div>
            ) : (
              qas.slice(0, 20).map((q) => (
                <div key={q.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-white/60">[{q.intent}]</div>
                    <div
                      className={
                        q.status === "approved"
                          ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-100"
                          : "rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70"
                      }
                    >
                      {q.status === "approved" ? "已審核" : "草稿"}
                    </div>
                  </div>

                  <div className="mt-2 text-sm">Q：{q.question}</div>
                  <div className="mt-1 text-sm text-white/80">A：{q.answer}</div>

                  <div className="mt-3 flex gap-2">
                    {q.status !== "approved" ? (
                      <button
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
                        onClick={() => approve(q.id)}
                      >
                        通過審核
                      </button>
                    ) : (
                      <div className="text-xs text-white/50">已可供右側互動問答使用</div>
                    )}

                    <button
                      className="ml-auto rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                      onClick={() => removeQA(q.id)}
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {qas.length > 20 && (
            <div className="mt-3 text-xs text-white/50">為了保持簡短，只顯示前 20 筆。</div>
          )}
        </section>

        {/* 右：互動問答 */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-base font-semibold">③ 互動問答（三光寶貝）</h2>

          <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-white/70">
            <div className="rounded-xl border border-white/10 bg-black/30 p-2">
              <div className="text-white/50">已審核</div>
              <div className="mt-1 text-sm text-white">{stats.ok}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-2">
              <div className="text-white/50">草稿</div>
              <div className="mt-1 text-sm text-white">{stats.draftCount}</div>
            </div>
            <div className="col-span-2 rounded-xl border border-white/10 bg-black/30 p-2">
              <div className="text-white/50">通過率</div>
              <div className="mt-1 text-sm text-white">{stats.passRate}%</div>
            </div>
          </div>

          <div className="mt-4 h-[420px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 pb-28">
            {chatLog.length === 0 ? (
              <div className="text-sm text-white/60">先審核通過一些題目，再來問我～</div>
            ) : (
              <div className="space-y-3">
                {chatLog.map((m) => (
                  <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
                    <div
                      className={
                        m.role === "user"
                          ? "inline-block max-w-[92%] rounded-2xl bg-white/10 px-3 py-2 text-sm"
                          : "inline-block max-w-[92%] rounded-2xl bg-white/5 px-3 py-2 text-sm"
                      }
                    >
                      {m.text}
                      {m.meta?.kind === "answer" && (
                        <div className="mt-2 text-xs text-white/60">
                          信心：{m.meta.confidence}｜{m.meta.score}%｜intent：{m.meta.intent}
                          <div className="mt-1 text-white/50">匹配題：{m.meta.matchedQuestion}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="輸入問題，例如：春曉的作者是誰？"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendChat();
              }}
            />
            <button
              className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
              onClick={sendChat}
              disabled={approved.length === 0}
              title={approved.length === 0 ? "請先審核通過題庫" : "送出"}
            >
              送出
            </button>
          </div>

          <div className="mt-3 text-xs text-white/50">
            圖片請放：<span className="text-white/70">public/sanguang-baobei.png</span>
          </div>

          {/* ✅ 會動的三光寶貝 + 對話框（只在互動問答區顯示） */}
          <Mascot text={mascotText} />
        </section>
      </main>
    </div>
  );
}
