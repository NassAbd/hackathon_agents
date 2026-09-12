import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { JSDOM } from "jsdom";
import { expect, it, vi } from "vitest";

function setup(
  body = '<div contenteditable="true" role="textbox"></div>',
  app = "email",
) {
  const dom = new JSDOM(`<main>${body}</main>`);
  const document = dom.window.document;
  const editor = document.querySelector<HTMLElement>("[contenteditable]")!;
  let receive: (
    message: object,
    sender: object,
    reply: (value: unknown) => void,
  ) => unknown = () => {};
  Object.defineProperty(document, "visibilityState", { value: "visible" });
  Object.defineProperty(editor, "getClientRects", { value: () => [1] });
  const execCommand = vi.fn((_command: string, _ui: boolean, text: string) => {
    editor.textContent = text;
    return true;
  });
  Object.assign(document, { execCommand });
  runInNewContext(readFileSync("extension/content.js", "utf8"), {
    document,
    window: dom.window,
    location: { href: "https://mail.google.com/mail/u/0/#inbox/ABCDEFGHIJKL" },
    HTMLElement: dom.window.HTMLElement,
    InputEvent: dom.window.InputEvent,
    MutationObserver: class {
      observe() {}
    },
    setTimeout: () => 0,
    clearTimeout() {},
    GhostDOM: { parse: () => ({ app, objectId: "thread", action: "REPLY" }) },
    chrome: {
      runtime: {
        onMessage: {
          addListener: (handler: typeof receive) => {
            receive = handler;
          },
        },
      },
    },
  });
  const insert = (extra = {}) => {
    let result: unknown;
    receive(
      {
        type: "insertDraft",
        text: "Verified response",
        objectId: "thread",
        ...extra,
      },
      {},
      (r) => {
        result = r;
      },
    );
    return result;
  };
  return { insert, editor, execCommand, document };
}
it("inserts into an empty matching reply and confirms the write, without sending", () => {
  const { insert, editor, execCommand } = setup();
  expect(insert()).toMatchObject({ ok: true });
  expect(editor.textContent).toBe("Verified response");
  expect(execCommand).toHaveBeenCalledExactlyOnceWith(
    "insertText",
    false,
    "Verified response",
  );
});
it("never overwrites existing text, even with an overwrite flag", () => {
  const { insert, editor, execCommand } = setup(
    '<div contenteditable="true" role="textbox">My writing</div>',
  );
  expect(insert({ overwrite: true })).toMatchObject({
    ok: false,
    reason: "composer-has-content",
  });
  expect(editor.textContent).toBe("My writing");
  expect(execCommand).not.toHaveBeenCalled();
});
it("blocks another thread, GitHub, and hidden or ambiguous composers", () => {
  expect(setup().insert({ objectId: "other" })).toMatchObject({ ok: false });
  expect(setup(undefined, "github").insert()).toMatchObject({ ok: false });
  const hidden = setup();
  hidden.editor.hidden = true;
  expect(hidden.insert()).toMatchObject({ ok: false });
  const multiple = setup();
  const second = multiple.editor.cloneNode(true) as HTMLElement;
  Object.defineProperty(second, "getClientRects", { value: () => [1] });
  multiple.document.querySelector("main")!.append(second);
  expect(multiple.insert()).toMatchObject({ ok: false });
});
