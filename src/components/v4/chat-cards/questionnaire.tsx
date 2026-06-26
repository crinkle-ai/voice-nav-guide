import { useState } from "react";
import { Button } from "@/components/ui/button";

export type QuestionnaireQuestion = {
  id: string;
  label: string;
  type: "single" | "multi" | "text";
  options?: string[];
};

export type QuestionnaireInput = {
  title: string;
  questions: QuestionnaireQuestion[];
};

type Props = {
  data: QuestionnaireInput;
  onSubmit: (text: string) => void;
  disabled?: boolean;
};

export function QuestionnaireCard({ data, onSubmit, disabled }: Props) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  const setSingle = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));
  const toggleMulti = (id: string, v: string) =>
    setAnswers((a) => {
      const cur = Array.isArray(a[id]) ? (a[id] as string[]) : [];
      return { ...a, [id]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });

  const submit = () => {
    const lines = data.questions.map((q) => {
      const v = answers[q.id];
      const text = Array.isArray(v) ? v.join(", ") : (v ?? "—");
      return `• ${q.label}: ${text || "—"}`;
    });
    onSubmit(`${data.title}\n${lines.join("\n")}`);
    setSubmitted(true);
  };

  return (
    <div className="mt-3 rounded-xl border border-ink/10 bg-surface-soft/40 p-4">
      <div className="font-serif text-base mb-3 text-ink">{data.title}</div>
      <div className="space-y-4">
        {data.questions.map((q) => (
          <div key={q.id}>
            <div className="text-sm font-medium mb-1.5 text-ink">{q.label}</div>
            {q.type === "text" ? (
              <input
                type="text"
                value={(answers[q.id] as string) ?? ""}
                onChange={(e) => setSingle(q.id, e.target.value)}
                disabled={submitted || disabled}
                className="w-full rounded-md border border-ink/10 bg-paper px-3 py-1.5 text-sm text-ink"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {q.options?.map((opt) => {
                  const selected =
                    q.type === "multi"
                      ? Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt)
                      : answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={submitted || disabled}
                      onClick={() => (q.type === "multi" ? toggleMulti(q.id, opt) : setSingle(q.id, opt))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        selected
                          ? "border-ink bg-ink text-paper"
                          : "border-ink/10 bg-surface-soft/40 text-ink hover:bg-surface-soft hover:border-ink/20"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          size="sm"
          onClick={submit}
          disabled={submitted || disabled}
          className="bg-ink hover:bg-ink/90 text-paper"
        >
          {submitted ? "Sent" : "Send answers"}
        </Button>
      </div>
    </div>
  );
}
