import { prisma } from "../lib/prisma";
import { secApiSearch, fetchHtml } from "../lib/sec";
import { parseFilingHtml } from "../lib/parse";
import { normalizeBankName } from "../lib/normalize";

export default async function discoverAndIngest() {
  const to = new Date();
  const from = new Date(Date.now()-1000*60*60*24*60); // last 60 days
  const fmt = (d:Date)=>d.toISOString().slice(0,19)+"Z";

  const result = await secApiSearch(
    `("acted as" OR "placement agent" OR "registered direct" OR "underwritten" OR "Sales Agreement")`,
    fmt(from), fmt(to)
  );

  const hits = (result as any)?.hits?.hits || [];
  for (const h of hits) {
    const src = h._source;
    const cik = (src.cik || "").toString().replace(/^0+/,"");
    const accession = src.accessionNo;
    const primaryUrl = src.linkToHtml;
    if (!cik || !accession || !primaryUrl) continue;

    const company = await prisma.company.upsert({
      where: { cik },
      update: { name: src.companyName || cik, ticker: src.ticker || null },
      create: { cik, name: src.companyName || cik, ticker: src.ticker || null }
    });

    const filing = await prisma.filing.upsert({
      where: { accession },
      update: {},
      create: {
        companyId: company.id,
        accession,
        form: src.formType,
        filedAt: new Date(src.filedAt),
        primaryUrl,
        edgarBaseUrl: src.linkToFilingDetails
      }
    });

    const html = await fetchHtml(primaryUrl);
    const parsed = parseFilingHtml(html);

    const deal = await prisma.deal.create({
      data: {
        companyId: company.id,
        filingId: filing.id,
        dealType: (parsed.dealType as any) ?? "Other",
        status: (parsed.status as any) ?? "Active",
        sourceSnippet: parsed.sourceSnippet?.slice(0,1000) || null,
        sourceUrl: primaryUrl,
        grossProceeds: parsed.terms.grossProceeds || undefined,
        pricePerUnit: parsed.terms.pricePerUnit || undefined,
        discountPct: parsed.terms.discountPct || undefined,
        warrantTerms: parsed.terms.warrantTerms || undefined
      }
    });

    for (const b of parsed.banks) {
      const name = await normalizeBankName(b.name);
      const bank = await prisma.bank.upsert({
        where: { name },
        update: {},
        create: { name, nameNormalized: name.toLowerCase() }
      });
      await prisma.dealBank.create({
        data: { dealId: deal.id, bankId: bank.id, role: (b.role as any) ?? "Agent" }
      });
    }
  }
}
