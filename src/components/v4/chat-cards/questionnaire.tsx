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
    <div className="mt-3 rounded-xl border border-line bg-canvas/40 p-4">
      <div className="font-serif text-base mb-3">{data.title}</div>
      <div className="space-y-4">
        {data.questions.map((q) => (
          <div key={q.id}>
            <div className="text-sm font-medium mb-1.5">{q.label}</div>
            {q.type === "text" ? (
              <input
                type="text"
                value={(answers[q.id] as string) ?? ""}
                onChange={(e) => setSingle(q.id, e.target.value)}
                disabled={submitted || disabled}
                className="w-full rounded-md border border-line bg-paper px-3 py-1.5 text-sm"
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
                          ? "border-accent bg-accent text-paper"
                          : "border-[#E5F5F8]/30 bg-[#E5F5F8]/15 text-[#E5F5F8] hover:bg-[#E5F5F8]/25 hover:border-[#E5F5F8]/50"
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
          className="bg-accent hover:bg-accent-2 text-paper"
        >
          {submitted ? "Sent" : "Send answers"}
        </Button>
      </div>
    </div>
  );
}
