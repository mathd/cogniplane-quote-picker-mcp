import assert from "node:assert/strict";
import { test } from "node:test";
import { QUOTES, SEATS, decisionMessage, qualifies, quoteSummary } from "../src/quotes.ts";

const byVendor = (v: string) => QUOTES.find((q) => q.vendor === v)!;

test("fixture totals match the quoted seat prices", () => {
  assert.equal(SEATS, 25);
  assert.deepEqual(
    QUOTES.map((q) => [q.vendor, q.seatPrice, q.monthlyTotal, q.termMonths]),
    [
      ["HelpHarbor", 38, 950, 12],
      ["TicketTide", 32, 800, 24],
      ["DeskNimbus", 44, 1100, 12],
    ],
  );
});

test("requirement toggles filter vendors", () => {
  const names = (active: Parameters<typeof qualifies>[1]) =>
    QUOTES.filter((q) => qualifies(q, active)).map((q) => q.vendor);
  assert.deepEqual(names([]), ["HelpHarbor", "TicketTide", "DeskNimbus"]);
  assert.deepEqual(names(["euData"]), ["HelpHarbor", "DeskNimbus"]);
  assert.deepEqual(names(["soc2"]), ["HelpHarbor", "TicketTide"]);
  assert.deepEqual(names(["euData", "soc2"]), ["HelpHarbor"]);
});

test("summary names every quote with its price, term and capabilities", () => {
  const text = quoteSummary({ seats: SEATS, quotes: QUOTES });
  assert.match(text, /HelpHarbor: \$38\/seat\/month, \$950\/month, 12-month term\. EU data residency: yes\. SOC 2: yes\. 24\/7 phone support: no\./);
  assert.match(text, /TicketTide: \$32\/seat\/month, \$800\/month, 24-month term\. EU data residency: no\. SOC 2: yes\. 24\/7 phone support: yes\./);
  assert.match(text, /DeskNimbus: \$44\/seat\/month, \$1,100\/month, 12-month term\. EU data residency: yes\. SOC 2: no\. 24\/7 phone support: yes\./);
  assert.match(text, /both EU data residency and SOC 2: HelpHarbor\./);
});

test("decision message names vendor, requirements and cost", () => {
  const msg = decisionMessage(byVendor("HelpHarbor"), ["euData", "soc2"], SEATS);
  assert.match(msg, /HelpHarbor/);
  assert.match(msg, /Required: EU data residency and SOC 2\./);
  assert.match(msg, /\$950\/month for 25 seats \(\$38\/seat\/month\), 12-month term/);
  assert.match(msg, /decision note/);
  assert.match(decisionMessage(byVendor("TicketTide"), [], SEATS), /Required: none selected\./);
});
