import { App, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import {
  REQUIREMENTS,
  decisionMessage,
  qualifies,
  usd,
  type QuotePickerData,
  type Requirement,
} from "./quotes.ts";
import "./mcp-app.css";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const subtitle = $("#subtitle");
const cards = $<HTMLFieldSetElement>("#cards");
const matchCount = $("#match-count");
const draft = $<HTMLButtonElement>("#draft");
const status = $("#status");
const switches = [...document.querySelectorAll<HTMLInputElement>(".reqs input")];

let data: QuotePickerData | undefined;
let selectedId: string | undefined;
let sending = false;
// True after a successful send. Cleared when the vendor or a requirement changes, so the same turn is not sent twice.
let sent = false;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const activeReqs = () => switches.filter((s) => s.checked).map((s) => s.value as Requirement);
const selectedQuote = () => data?.quotes.find((q) => q.id === selectedId);

function setStatus(text: string, tone: "muted" | "ok" | "error" = "muted") {
  status.textContent = text;
  status.className = tone;
}

function capability(label: string, has: boolean) {
  return `<li class="${has ? "has" : "lacks"}"><span aria-hidden="true">${has ? "✓" : "✗"}</span> ${label}<span class="sr-only">: ${has ? "yes" : "no"}</span></li>`;
}

function render() {
  if (!data) return;
  const active = activeReqs();
  const matches = data.quotes.filter((q) => qualifies(q, active));
  matchCount.textContent = `${matches.length} of ${data.quotes.length} vendors qualify`;

  cards.querySelectorAll(".card").forEach((el) => el.remove());
  for (const q of data.quotes) {
    const ok = qualifies(q, active);
    const missing = active.filter((r) => !q[r]).map((r) => REQUIREMENTS[r]);
    const card = document.createElement("div");
    card.className = `card${ok ? "" : " out"}${q.id === selectedId ? " selected" : ""}`;
    card.innerHTML = `
      <label>
        <input type="radio" name="vendor" value="${esc(q.id)}" ${ok ? "" : "disabled"} ${q.id === selectedId ? "checked" : ""} aria-describedby="d-${esc(q.id)}" />
        <span class="vendor">${esc(q.vendor)}</span>
      </label>
      <div id="d-${esc(q.id)}">
        <p class="badge">${ok ? "Meets requirements" : `Missing ${missing.join(" and ")}`}</p>
        <p class="price"><strong>${usd(q.monthlyTotal)}</strong> / month</p>
        <p class="muted">${usd(q.seatPrice)} per seat × ${data.seats} seats</p>
        <ul>
          <li>${q.termMonths}-month term</li>
          ${capability("EU data residency", q.euData)}
          ${capability("SOC 2", q.soc2)}
          ${capability("24/7 phone support", q.phone247)}
        </ul>
      </div>`;
    cards.append(card);
  }
  draft.disabled = sending || sent || !selectedQuote();
}

switches.forEach((s) =>
  s.addEventListener("change", () => {
    const q = selectedQuote();
    if (q && !qualifies(q, activeReqs())) {
      selectedId = undefined;
      setStatus(`${q.vendor} no longer meets the requirements. Pick another vendor.`);
    } else if (q && sent) {
      setStatus(`Requirements changed. ${q.vendor} selected, ${usd(q.monthlyTotal)}/month.`);
    }
    sent = false;
    render();
  }),
);

cards.addEventListener("change", (e) => {
  selectedId = (e.target as HTMLInputElement).value;
  sent = false;
  const q = selectedQuote()!;
  render();
  cards.querySelector<HTMLInputElement>(`input[value="${CSS.escape(q.id)}"]`)?.focus();
  setStatus(`${q.vendor} selected, ${usd(q.monthlyTotal)}/month.`);
});

const app = new App({ name: "Quote Picker", version: "1.0.0" });

// Set handlers before connect() so the first tool result is not missed.
app.addEventListener("toolresult", (result) => {
  const sc = result.structuredContent as QuotePickerData | undefined;
  if (result.isError || !Array.isArray(sc?.quotes)) {
    subtitle.textContent = "The server did not return quote data. Ask the assistant to run the tool again.";
    return;
  }
  data = sc;
  subtitle.textContent = `${data.seats} seats. Fictional vendors, monthly prices in USD.`;
  render();
});

app.addEventListener("hostcontextchanged", (ctx) => {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
});

draft.addEventListener("click", async () => {
  const q = selectedQuote();
  if (!q || !data || sending || sent) return;
  sending = true;
  draft.disabled = true;
  draft.textContent = "Sending…";
  setStatus("Sending the request to the chat.");
  try {
    const result = await app.sendMessage({
      role: "user",
      content: [{ type: "text", text: decisionMessage(q, activeReqs(), data.seats) }],
    });
    if (result.isError) {
      setStatus("The host rejected the message, so nothing was sent. Try again, or type the request in the chat.", "error");
    } else {
      sent = true;
      setStatus(`Sent to the chat: decision draft for ${q.vendor}. To send another, change the vendor or a requirement.`, "ok");
    }
  } catch (err) {
    setStatus(`Could not send the message: ${err instanceof Error ? err.message : String(err)}. Try again, or type the request in the chat.`, "error");
  } finally {
    sending = false;
    draft.textContent = "Draft decision";
    render();
  }
});

app.connect().then(
  () => {
    const theme = app.getHostContext()?.theme;
    if (theme) applyDocumentTheme(theme);
  },
  (err) => setStatus(`Could not connect to the host: ${err instanceof Error ? err.message : String(err)}`, "error"),
);
