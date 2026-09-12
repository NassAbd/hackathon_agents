/* Shared by the content script and saved-DOM tests. Never reads form values. */
(function (root) {
  function visible(element) {
    if (!element || element.closest('[hidden], [aria-hidden="true"]'))
      return false;
    const view = element.ownerDocument.defaultView;
    for (let node = element; node; node = node.parentElement) {
      const style = view.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden")
        return false;
    }
    return true;
  }
  function text(element) {
    if (!visible(element)) return "";
    function read(node) {
      if (node.nodeType === 3) return node.textContent ?? "";
      if (
        node.nodeType !== 1 ||
        !visible(node) ||
        node.matches(
          'script,style,input,textarea,[contenteditable], [role="toolbar"]',
        )
      )
        return "";
      if (node.tagName === "BR") return "\n";
      const value = [...node.childNodes].map(read).join("");
      return /^(P|DIV|H[1-6]|LI|PRE|BLOCKQUOTE)$/.test(node.tagName)
        ? `${value}\n`
        : value;
    }
    return read(element)
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .replace(
        /(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g,
        "[credential redacted]",
      )
      .replace(
        /(?:password|authorization|cookie|access_token|refresh_token|api[_ -]?key)\s*[:=]\s*\S+/gi,
        "[credential redacted]",
      );
  }
  function parse(document, href) {
    const url = new URL(href);
    const main = [...document.querySelectorAll('[role="main"], main')].find(
      visible,
    );
    if (!main) return null;
    if (url.origin === "https://mail.google.com") {
      const match = url.hash.match(
        /^#(?:inbox|all|sent|starred|important|label\/[^/]+|search\/[^/]+)\/([A-Za-z0-9_-]{10,})$/,
      );
      if (!match) return null;
      const subject = [
        ...main.querySelectorAll("h2.hP, h2[data-thread-perm-id], h2"),
      ].find(visible);
      const bodies = [...main.querySelectorAll(".a3s")].filter(visible);
      if (!subject || !bodies.length) return null;
      const messages = bodies
        .slice(-6)
        .map((body) => {
          const message = body.closest(".adn");
          const sender = message?.querySelector("[email]");
          return `${sender && visible(sender) ? `From: ${sender.getAttribute("email")}\n` : ""}${text(body)}`;
        })
        .filter(Boolean);
      const title = text(subject).slice(0, 250);
      const composer = [
        ...main.querySelectorAll('[contenteditable="true"][role="textbox"]'),
      ].some(visible);
      return {
        app: "email",
        objectId: `${url.pathname}${match[1]}`,
        title,
        content: `Subject: ${title}\n${messages.join("\n\n")}`.slice(0, 16000),
        action: composer ? "REPLY" : "OPEN",
      };
    }
    if (
      url.origin === "https://github.com" &&
      /^\/NassAbd\/ghost-demo-workspace\/issues\/\d+\/?$/.test(url.pathname)
    ) {
      const titleNode = [
        ...main.querySelectorAll(
          '[data-testid="issue-title"], .js-issue-title, bdi',
        ),
      ].find(visible);
      const bodies = [
        ...main.querySelectorAll(
          '[data-testid="issue-body-viewer"] [data-testid="markdown-body"], .js-comment-body, [data-testid="comment-body"]',
        ),
      ].filter(visible);
      // Deduplicate nested body containers; no sidebar/repository-wide text.
      const uniqueBodies = bodies.filter(
        (body) =>
          !bodies.some((other) => other !== body && other.contains(body)),
      );
      if (!titleNode || !uniqueBodies.length) return null;
      const status = [
        ...main.querySelectorAll(
          '[data-testid="header-state"], [data-testid="issue-state"], [data-testid="issue-state-header"], .State',
        ),
      ].find(visible);
      const title = text(titleNode).slice(0, 250);
      return {
        app: "github",
        objectId: url.pathname.replace(/\/$/, ""),
        title,
        content:
          `Repository: NassAbd/ghost-demo-workspace\nIssue: ${url.pathname.split("/").pop()}\nTitle: ${title}\n${status ? `Status: ${text(status)}\n` : ""}${uniqueBodies.slice(0, 8).map(text).join("\n\n")}`.slice(
            0,
            16000,
          ),
        action: "OPEN",
      };
    }
    return null;
  }
  root.GhostDOM = { parse };
})(globalThis);
