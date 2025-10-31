import * as cheerio from "cheerio";

const ROLE_PATTERNS = [
  /acted as (?:exclusive )?(placement agent|underwriter|book[- ]?running manager|bookrunner|sales agent|co[- ]?manager|financial advisor)/i,
  /(is|are|will be|served as|serving as) (?:the )?(placement agent|underwriter|book[- ]?runner|sales agent|co[- ]?manager|agent|financial advisor)/i,
  /sales agreement(?: dated [A-Za-z0-9, ]+)? (?:with|between)\s+([A-Za-z\.\-&,' ]+)/i
];

const DEAL_CLASSIFIERS: Array<[RegExp, string]> = [
  [/at[- ]?the[- ]?market|sales agreement|atm offering/i, "ATM"],
  [/registered direct/i, "Registered_Direct"],
  [/underwritten (?:public )?offering|book[- ]?running/i, "Underwritten"],
  [/private placement|securities purchase agreement/i, "PIPE"],
  [/equity line|standby equity purchase agreement/i, "ELOC_SEPA"],
  [/warrant inducement|amend the exercise price/i, "Warrant_Inducement"],
  [/convertible notes?/i, "Convertible_Notes"],
  [/senior notes?/i, "Senior_Notes"]
];

const TERM_REGEX = {
  price: /\$\s?([0-9]+(?:\.[0-9]{1,4})?)\s?(?:per (?:share|unit))/i,
  gross: /gross proceeds of (?:approximately )?\$([0-9\.,]+)\s?(million|thousand)?/i,
  discount: /discount of\s?([0-9]{1,2}(?:\.[0-9]+)?)%/i,
  warrantExercise: /exercise price of\s?\$([0-9\.]+)/i,
  warrantTerm: /term of\s?([0-9]+)\s?(months?|years?)/i
};

export function detectStatus(t: string): "Active"|"Finished"|"Pending" {
  const s = t.toLowerCase();
  if (/(has )?entered into|is acting as|execution of/.test(s)) return "Active";
  if (/closed|consummated|completed|has sold an aggregate of/.test(s)) return "Finished";
  if (/proposed|intends to/.test(s)) return "Pending";
  return "Active";
}

export function parseFilingHtml(html: string) {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g," ").trim();
  const sentences = text.split(/(?<=[\.\!\?])\s+/);
  const banks: Array<{name:string; role:string; sentence:string}> = [];

  for (const sent of sentences) {
    for (const pat of ROLE_PATTERNS) {
      const m = pat.exec(sent);
      if (m) {
        const role = (m[1] || m[2] || "Agent").toString().replace(/[- ]/g,"_");
        const bankGuess = sent.match(/[A-Z][A-Za-z\.\-&,' ]{2,60}(?:LLC|Inc\.?|Corp\.?|Securities|Partners|Capital|Genuity|Riley|Jefferies)?/g)?.[0] ?? "Unknown";
        banks.push({ name: bankGuess.trim(), role, sentence: sent.trim() });
      }
    }
  }

  let dealType = "Other";
  for (const [re, label] of DEAL_CLASSIFIERS) if (re.test(text)) { dealType = label; break; }

  const terms:any = {};
  const p = text.match(TERM_REGEX.price); if (p) terms.pricePerUnit = parseFloat(p[1]);
  const g = text.match(TERM_REGEX.gross);
  if (g) { const base = parseFloat(g[1].replace(/,/g,"")); terms.grossProceeds = g[2]?.toLowerCase().startsWith("million") ? base*1e6 : g[2]?.toLowerCase().startsWith("thousand") ? base*1e3 : base; }
  const d = text.match(TERM_REGEX.discount); if (d) terms.discountPct = parseFloat(d[1]);
  const wx = text.match(TERM_REGEX.warrantExercise);
  const wt = text.match(TERM_REGEX.warrantTerm);
  if (wx || wt) terms.warrantTerms = { exercise: wx?parseFloat(wx[1]):undefined, term: wt?parseInt(wt[1]):undefined, termUnit: wt?wt[2]:undefined };

  const status = detectStatus(text);

  return { banks, dealType, terms, status, sourceSnippet: sentences.find(s=>s.toLowerCase().includes("placement agent")||s.toLowerCase().includes("underwritten")||s.toLowerCase().includes("sales agreement")) || sentences[0] };
}
