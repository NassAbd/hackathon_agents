import type { Fact } from "./fixtures";
type Sentence = {
  id: string;
  text: string;
  factId: string | null;
  paragraph: number;
};
const sentences: Sentence[] = [
  { id: "greeting", text: "Hi Sarah,", factId: null, paragraph: 0 },
  {
    id: "acknowledge",
    text: "Thank you for flagging this. I understand your concern about recurring payment failures ahead of renewal.",
    factId: "concern",
    paragraph: 1,
  },
  {
    id: "eu",
    text: "The payment failures affected the EU region only.",
    factId: "eu",
    paragraph: 2,
  },
  {
    id: "deploy",
    text: "They began after our latest deployment.",
    factId: "deploy",
    paragraph: 2,
  },
  {
    id: "cause",
    text: "The root cause was a routing configuration error.",
    factId: "cause",
    paragraph: 2,
  },
  {
    id: "fix",
    text: "The fix was deployed at 14:32 UTC.",
    factId: "fix",
    paragraph: 3,
  },
  {
    id: "normal",
    text: "The payment error rate has returned to normal.",
    factId: "normal",
    paragraph: 3,
  },
  {
    id: "renewal",
    text: "With your renewal in 19 days, I understand how important payment reliability is for your team.",
    factId: "renewal",
    paragraph: 4,
  },
  { id: "closing", text: "Best,\nAlex", factId: null, paragraph: 5 },
];
export function approvedSentences(facts: Fact[]): Sentence[] {
  const ids = new Set(facts.filter((f) => f.customerSafe).map((f) => f.id));
  return sentences.filter((s) => s.factId === null || ids.has(s.factId));
}
const alternatives: Record<string, string> = {
  greeting: "Hello Sarah,",
  acknowledge:
    "I’m sorry for the frustration these recurring payment failures have caused, especially ahead of your renewal.",
  cause:
    "We traced the issue to an error in the payment routing configuration.",
  fix: "We deployed the fix at 14:32 UTC.",
  normal: "Payment errors are now back at their normal rate.",
  renewal:
    "I appreciate the importance of reliable payments as you approach renewal in 19 days.",
  closing: "Best regards,\nAlex",
};
export function draftChoices(facts: Fact[]) {
  return approvedSentences(facts).map((sentence) => ({
    group: sentence.id,
    choices: [
      sentence,
      ...(alternatives[sentence.id]
        ? [
            {
              ...sentence,
              id: `${sentence.id}_alternative`,
              text: alternatives[sentence.id],
            },
          ]
        : []),
    ],
  }));
}
export function buildDraft(
  facts: Fact[],
  selection?: string[],
): { text: string; factIds: string[] } {
  const approved = approvedSentences(facts);
  const ids = selection ?? approved.map((s) => s.id);
  // Every output claim comes from a collected source. The model cannot add free-form commitments.
  if (
    ids.length !== approved.length ||
    new Set(ids).size !== ids.length ||
    ids.some(
      (id, i) =>
        !draftChoices(facts)[i].choices.some((choice) => choice.id === id),
    )
  )
    throw new Error("Ungrounded draft selection");
  const paragraphs = new Map<number, string[]>();
  const selected = draftChoices(facts).map((group, index) =>
    group.choices.find((choice) => choice.id === ids[index])!,
  );
  for (const sentence of selected) {
    const lines = paragraphs.get(sentence.paragraph) ?? [];
    lines.push(sentence.text);
    paragraphs.set(sentence.paragraph, lines);
  }
  return {
    text: [...paragraphs.values()].map((lines) => lines.join(" ")).join("\n\n"),
    factIds: approved.flatMap((s) => (s.factId ? [s.factId] : [])),
  };
}
