import { prisma } from "./prisma";
import { secApiSearch, fetchHtml } from "./sec";
import { parseFilingHtml } from "./parse";
import { normalizeBankName } from "./normalize";

export default async function discoverAndIngest() {
  console.log("🔍 Discovering new filings from SEC…");

  // Be lenient: allow any shape; sec.ts should return an array.
  const filings: any[] = await secApiSearch();

  if (!Array.isArray(filings) || filings.length === 0) {
    console.log("ℹ️ No new filings returned.");
    return;
  }

  for (const f of filings) {
    try {
      // Normalize common field names across different sources
      const accession =
        f.accession ||
        f.accessionNo ||
        f.accession_number ||
        "";
      const url =
        f.url ||
        f.linkToHtml ||
        "";
      const cik = ((f.cik  f.cikNumber  "") as string).toString();
      const companyName = f.companyName  f.company  "";
      const ticker = f.ticker || null;
      const form = f.form  f.formType  "UNKNOWN";
      const filedAt = f.filedAt  f.filingDate  new Date().toISOString();
      const baseUrl = f.baseUrl  f.linkToFilingDetails  "";

      if (!accession  !url  !cik) {
        console.log("↷ Skipping (missing keys)", { accession, url, cik });
        continue;
      }

      // Skip duplicates
      const exists = await prisma.filing.findUnique({ where: { accession } });
      if (exists) {
        // console.log("Already ingested", accession);
        continue;
      }

      // Upsert company
      const company = await prisma.company.upsert({
        where: { cik },
        update: { name: companyName  cik, ticker: ticker  null },
        create: { cik, name: companyName  cik, ticker: ticker  null }
      });

      // Create filing record
      const filing = await prisma.filing.create({
        data: {
          companyId: company.id,
          accession,
          form,
          filedAt: new Date(filedAt),
          primaryUrl: url,
          edgarBaseUrl: baseUrl,
          status: "fetched"
        }
      });

      // Fetch + parse the HTML
      const html = await fetchHtml(url);
      const parsed: any = parseFilingHtml(html);
      // parsed.dealType, parsed.status, parsed.terms{pricePerUnit,grossProceeds,discountPct,warrantTerms}, parsed.banks[], parsed.sourceSnippet

      // Create a deal entry
      const deal = await prisma.deal.create({
        data: {
          companyId: company.id,
          filingId: filing.id,
          dealType: parsed?.dealType || "Other",
          status: parsed?.status || "Active",
          sourceSnippet: parsed?.sourceSnippet ? String(parsed.sourceSnippet).slice(0, 1000) : null,
          sourceUrl: url,
          pricePerUnit: parsed?.terms?.pricePerUnit ?? null,
          grossProceeds: parsed?.terms?.grossProceeds ?? null,
          discountPct: parsed?.terms?.discountPct ?? null,
          warrantTerms: parsed?.terms?.warrantTerms ?? undefined
        }
      });

      // Link banks/roles
      if (Array.isArray(parsed?.banks)) {
        for (const b of parsed.banks) {
          const rawName = b?.name ? String(b.name) : "Unknown";
          const clean = await normalizeBankName(rawName);
          const bank = await prisma.bank.upsert({
            where: { nameNormalized: clean.toLowerCase() },
            update: {},
            create: { name: clean, nameNormalized: clean.toLowerCase() }
          });
          await prisma.dealBank.create({
            data: {
              dealId: deal.id,
              bankId: bank.id,
              role: (b?.role as any) || "Agent"
            }
          });
        }
      }

      console.log("✅ Ingested", accession, companyName || cik);
    } catch (err) {
      console.error("❌ Error processing filing", f?.accession || f?.accessionNo, err);
    }
  }

  console.log("✅ Discovery run complete.");
}

