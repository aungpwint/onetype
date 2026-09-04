import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, Trophy, Timer } from "lucide-react";
import * as backend from "../services/backend";
import type { TestResult, TypingTest } from "../services/types";
import { useStudentStore } from "../stores/student-store";
import { Spinner } from "../components/ui";

function groupByLanguage(tests: TypingTest[]): Array<{ language: string; tests: TypingTest[] }> {
  const order = ["myanmar", "english", "mixed"];
  const map = new Map<string, TypingTest[]>();
  for (const t of tests) {
    const lang = t.language === "english" ? "english" : t.language === "mixed" ? "mixed" : "myanmar";
    map.set(lang, [...(map.get(lang) ?? []), t]);
  }
  return order.filter((l) => map.has(l)).map((l) => ({ language: l, tests: map.get(l)! }));
}

export default function TestsPage() {
  const active = useStudentStore((s) => s.active);
  const [tests, setTests] = useState<TypingTest[] | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);

  useEffect(() => {
    void (async () => {
      const all = await backend.listTypingTests();
      setTests(all);
    })();
  }, []);

  useEffect(() => {
    if (!active) return;
    void (async () => {
      setResults(await backend.listTestResults(active.id));
    })();
  }, [active]);

  const bestByTest = new Map<string, TestResult>();
  for (const r of results) {
    const prev = bestByTest.get(r.testId);
    if (!prev || r.wpm > prev.wpm) bestByTest.set(r.testId, r);
  }

  const groups = tests ? groupByLanguage(tests) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header>
        <p className="eyebrow">Examination desk</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">Timed tests</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Fix a time, meet the target. In a real exam you type for the whole duration, so keep a steady pace and let the paper run.
        </p>
      </header>

      {tests === null ? (
        <Spinner label="Gathering the papers…" />
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tests seeded. Add them in <code>src/data/seeds</code>.</p>
      ) : (
        groups.map((group) => (
          <section key={group.language}>
            <h2 className="mb-3 capitalize text-muted-foreground">{group.language === "english" ? "English" : group.language === "mixed" ? "Mixed" : "Myanmar"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.tests.map((test) => {
                const best = bestByTest.get(test.id);
                return (
                  <Link key={test.id} to={`/test/${test.id}`} className="card flex items-center justify-between gap-4 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="tnum rounded-md bg-muted px-2 py-0.5 font-mono text-xs">{test.code}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Timer className="size-3" />
                          {test.durationSeconds} s
                        </span>
                      </div>
                      <p className="ms mt-2 font-display text-lg leading-tight">{test.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Target {test.minAccuracy}% acc{test.minWpm !== null ? ` · ${test.minWpm} wpm` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      {best ? (
                        <>
                          <p className="tnum font-display text-2xl text-success">{Math.round(best.wpm)}</p>
                          <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                            <Trophy className="size-3 text-brass" />
                            best wpm
                          </p>
                        </>
                      ) : (
                        <p className="ml-auto text-sm text-muted-foreground">not yet</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}

      {results.length > 0 ? (
        <section className="card overflow-hidden">
          <h2 className="border-b border-border px-5 py-3 font-display text-lg">My attempt log</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2 font-normal">Test</th>
                <th className="px-5 py-2 text-right font-normal">Attempt</th>
                <th className="px-5 py-2 text-right font-normal">WPM</th>
                <th className="px-5 py-2 text-right font-normal">Acc</th>
                <th className="px-5 py-2 text-right font-normal">Pass</th>
              </tr>
            </thead>
            <tbody>
              {results.slice(0, 20).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="ms px-5 py-2">{r.testId}</td>
                  <td className="tnum px-5 py-2 text-right">{r.attempt}</td>
                  <td className="tnum px-5 py-2 text-right">{Math.round(r.wpm)}</td>
                  <td className="tnum px-5 py-2 text-right">{r.accuracy.toFixed(0)}%</td>
                  <td className="px-5 py-2 text-right">
                    {r.passed ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <Check className="size-4" />
                        passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <X className="size-4" />
                        <span className="sm:hidden">not yet</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}