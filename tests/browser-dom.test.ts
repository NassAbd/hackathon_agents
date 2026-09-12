import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { JSDOM } from "jsdom";
import { expect, it } from "vitest";
const sandbox: {
  URL: typeof URL;
  GhostDOM?: {
    parse(
      document: Document,
      href: string,
    ): { content: string; title: string; action: string } | null;
  };
} = { URL };
runInNewContext(readFileSync("extension/parser.js", "utf8"), sandbox);
const parse = sandbox.GhostDOM!.parse;
const gmail = "https://mail.google.com/mail/u/0/#inbox/ABCDEFGHIJKL";
it("extracts only the displayed Gmail thread and detects Reply without reading the draft", () => {
  const document = new JSDOM(
    readFileSync("tests/dom/gmail-thread.html", "utf8"),
  ).window.document;
  const result = parse(document, gmail)!;
  expect(result.title).toBe("Payment failures before renewal");
  expect(result.action).toBe("REPLY");
  expect(result.content).toContain("sarah@acme.example");
  expect(result.content).toContain("EU payment failures");
  for (const privateText of [
    "UNRELATED",
    "HIDDEN",
    "PASSWORD",
    "UNSENT",
    "COLLAPSED",
    "synthetic-sensitive-placeholder",
  ])
    expect(result.content).not.toContain(privateText);
  expect(parse(document, "https://mail.google.com/mail/u/0/#inbox")).toBeNull();
});
it("handles missing or collapsed Gmail bodies without guessing from the mailbox", () => {
  const document = new JSDOM(
    '<main><h2>Inbox</h2><div class="a3s" hidden>Hidden</div></main>',
  ).window.document;
  expect(parse(document, gmail)).toBeNull();
});
it("extracts the GitHub issue body and visible status using observed DOM markers", () => {
  const document = new JSDOM(
    readFileSync("tests/dom/github-issue.html", "utf8"),
  ).window.document;
  const result = parse(
    document,
    "https://github.com/NassAbd/ghost-demo-workspace/issues/1",
  )!;
  expect(result.content).toContain("Status: Open");
  expect(result.content).toContain("Fix deployed at 14:32 UTC.");
  for (const unrelated of [
    "UNRELATED",
    "HIDDEN",
    "Reaction controls",
    "profile metadata",
  ])
    expect(result.content).not.toContain(unrelated);
  expect(
    parse(document, "https://github.com/NassAbd/ghost-demo-workspace"),
  ).toBeNull();
});
