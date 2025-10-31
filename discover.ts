import { prisma } from "./prisma";
import { secApiSearch, fetchHtml } from "./sec";
import { parseFilingHtml } from "./parse";
import { normalizeBankName } from "./normalize";

/** Minimal shape we expect back from secApiSearch() */
type FilingHit = {
  accession?: string;
  form?: string;
  filedAt?: string;
  url?: string;
  baseUrl?: string;
  cik?: string;
  companyName?: string;
  ticker?: string | null;
};

export default async function discoverAndIngest() {
  console.log("🔍 Discovering new filings from SEC…");

  // Get an array of filings (your sec.ts returns data.filings || [])
  const filings: FilingHit[] = await secApiSearch();

  if (!Array.isArray(filings) || filings.length === 0) {
    console.log("ℹ️ No new filings returned.");
    return;
  }

  for (const f of filings) {
    try {
      // Basic guards
      if (!f.accession  !f.url  !f.cik) {
        console.log("↷ Skipping filing with missing keys", {
          accession: f.accession,
          url: f.url,
          cik: f.cik,
        });
        continue;
      }

      // Skip if we already saved this accession
      const already = await prisma.filing.findUnique({
        where: { accession: f.accession },
        select: { id: true },
      });
      if (already) {
        // console.log("✅ Already ingested", f.accession);
        continue;
      }

      // Upsert company
      const company = await prisma.company.upsert({
        where: { cik: f.cik },
        update: {
          name: f.companyName ?? f.cik,
          ticker: f.ticker ?? null,
        },
        create: {
          cik: f.cik,
          name: f.companyName ?? f.cik,
          ticker: f.ticker ?? null,
        },
      });

      // Create filing shell
      const filing = await prisma.filing.create({
        data: {
          companyId: company.id,
          accession: f.accession,
          form: f.form ?? "UNKNOWN",
          filedAt: f.filedAt ? new Date(f.filedAt) : new Date(),
          primaryUrl: f.url,
          edgarBaseUrl: f.baseUrl ?? "",
          status: "fetched",
        },
      });

      // Fetch + parse HTML to extract deal info
      const html = await fetchHtml(f.url);
      const parsed = parseFilingHtml(html);
      // parsed: { banks[], dealType, terms{pricePerUnit,grossProceeds,discountPct,warrantTerms}, status, sourceSnippet }

      // Create the deal row (one per filing; good enough for MVP)
      const deal = await prisma.deal.create({
        data: {
          companyId: company.id,
          filingId: filing.id,
          dealType: (parsed.dealType as any) ?? "Other",
          status: (parsed.status as any) ?? "Active",
          sourceSnippet: parsed.sourceSnippet?.slice(0, 1000) ?? null,
          sourceUrl: f.url,
          pricePerUnit: parsed.terms?.pricePerUnit ?? null,
          grossProceeds: parsed.terms?.grossProceeds ?? null,
          discountPct: parsed.terms?.discountPct ?? null,
          warrantTerms: parsed.terms?.warrantTerms ?? undefined,
        },
      });

      // Link banks/roles to the deal
      if (Array.isArray(parsed.banks)) {
        for (const b of parsed.banks) {
          const clean = await normalizeBankName(b.name || "Unknown");
          const bank = await prisma.bank.upsert({
            where: { nameNormalized: clean.toLowerCase() },
            update: {},
            create: { name: clean, nameNormalized: clean.toLowerCase() },
          });

          await prisma.dealBank.create({
            data: {
              dealId: deal.id,
              bankId: bank.id,
              role: (b.role as any) ?? "Agent",
            },
          });
        }
      }

      console.log("✅ Ingested", f.accession, f.companyName ?? f.cik);
    } catch (err) {
      console.error("❌ Error on filing", f?.accession, err);
    }
  }

  console.log("✅ Discovery run complete.");


