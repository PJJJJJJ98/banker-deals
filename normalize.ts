import { prisma } from "./prisma";
export async function normalizeBankName(raw: string) {
  const aliases = await prisma.bankAlias.findMany({ include: { bank: true }});
  const hay = raw.toLowerCase().trim();
  for (const a of aliases) {
    if (a.alias.toLowerCase() === hay) return a.bank.name;
  }
  const banks = await prisma.bank.findMany();
  for (const b of banks) if (b.name.toLowerCase() === hay) return b.name;
  return raw.replace(/\s{2,}/g," ").replace(/[.,]$/,"").trim();
}
