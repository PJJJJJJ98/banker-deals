import { prisma } from "./prisma";
import { secApiSearch, fetchHtml } from "./sec";
import { parseFilingHtml } from "./parse";
import { normalizeBankName } from "./normalize";

export default async function discoverAndIngest() {
  console.log("🔍 Discovering new filings from SEC...");
  const filings = await secApiSearch();

  for (const filing of filings) {
    try {
      const existing = await prisma.filing.findUnique({
        where: { accession: filing.accession },
      });
      if (existing) continue;

      const html = await fetchHtml(filing.url);
      const parsed = parseFilingHtml(html);

      await prisma.filing.create({
        data: {
          accession: filing.accession,
          form: filing.form,
          filedAt: new Date(filing.filedAt),
          primaryUrl: filing.url,
          edgarBaseUrl: filing.baseUrl,
          company: {
            connectOrCreate: {
              where: { cik: filing.cik },
              create: {
                cik: filing.cik,
                name: filing.companyName,
                ticker: filing.ticker,
              },
            },
          },
        },
      });

      for (const deal of parsed.deals) {
        const normBank = normalizeBankName(deal.bank);
        const bank = await prisma.bank.upsert({
          where: { nameNormalized: normBank },
          update: {},
          create: { name: deal.bank, nameNormalized: normBank },
        });

        await prisma.deal.create({
          data: {
            dealType: deal.type,
            pricePerUnit: deal.price,
            discountPct: deal.discount,
            grossProceeds: deal.amount,
            company: { connect: { cik: filing.cik } },
            filing: { connect: { accession: filing.accession } },
            participants: {
              create: { bankId: bank.id, role: deal.role },
            },
          },
        });
      }
    } catch (err) {
      console.error("❌ Error processing filing", filing.accession, err);
    }
  }
  console.log("✅ Discovery complete.");

