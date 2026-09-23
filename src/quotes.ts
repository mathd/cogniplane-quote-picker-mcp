// Fictional quote data and the text built from it. The server and the UI both
// import this file, so the numbers stay the same everywhere.

export const SEATS = 25;

export const REQUIREMENTS = {
  euData: "EU data residency",
  soc2: "SOC 2",
} as const;

export type Requirement = keyof typeof REQUIREMENTS;

export interface Quote {
  id: string;
  vendor: string;
  seatPrice: number;
  monthlyTotal: number;
  termMonths: number;
  euData: boolean;
  soc2: boolean;
  phone247: boolean;
}

export interface QuotePickerData {
  seats: number;
  quotes: Quote[];
}

const quote = (q: Omit<Quote, "monthlyTotal">): Quote => ({
  ...q,
  monthlyTotal: q.seatPrice * SEATS,
});

export const QUOTES: Quote[] = [
  quote({ id: "helpharbor", vendor: "HelpHarbor", seatPrice: 38, termMonths: 12, euData: true, soc2: true, phone247: false }),
  quote({ id: "tickettide", vendor: "TicketTide", seatPrice: 32, termMonths: 24, euData: false, soc2: true, phone247: true }),
  quote({ id: "desknimbus", vendor: "DeskNimbus", seatPrice: 44, termMonths: 12, euData: true, soc2: false, phone247: true }),
];

export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const yesNo = (b: boolean) => (b ? "yes" : "no");

export const qualifies = (q: Quote, active: readonly Requirement[]) =>
  active.every((r) => q[r]);

export function quoteSummary(data: QuotePickerData): string {
  const lines = data.quotes.map(
    (q) =>
      `- ${q.vendor}: ${usd(q.seatPrice)}/seat/month, ${usd(q.monthlyTotal)}/month, ${q.termMonths}-month term. ` +
      `EU data residency: ${yesNo(q.euData)}. SOC 2: ${yesNo(q.soc2)}. 24/7 phone support: ${yesNo(q.phone247)}.`,
  );
  const both = data.quotes.filter((q) => qualifies(q, ["euData", "soc2"])).map((q) => q.vendor);
  return [
    `Fictional support desk quotes for ${data.seats} seats:`,
    ...lines,
    `Vendors with both EU data residency and SOC 2: ${both.join(", ") || "none"}.`,
    "The user filters by requirement and picks a vendor in the app. The app then sends a chat message that asks for a decision draft.",
  ].join("\n");
}

export function decisionMessage(q: Quote, active: readonly Requirement[], seats: number): string {
  const reqs = active.length ? active.map((r) => REQUIREMENTS[r]).join(" and ") : "none selected";
  return (
    `Draft a short decision note: we choose ${q.vendor} for our support desk. ` +
    `Required: ${reqs}. ` +
    `Quote: ${usd(q.monthlyTotal)}/month for ${seats} seats (${usd(q.seatPrice)}/seat/month), ${q.termMonths}-month term. ` +
    "Keep it under 150 words and name what we give up compared with the other two quotes."
  );
}
