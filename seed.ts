import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const BANK_ALIASES: Record<string, string[]> = {
  "H.C. Wainwright & Co.": ["H.C. Wainwright","HCW","H C Wainwright"],
  "A.G.P./Alliance Global Partners": ["AGP","Alliance Global Partners","A.G.P."],
  "Maxim Group LLC": ["Maxim","Maxim Group"],
  "Roth MKM": ["ROTH","Roth Capital","Roth MKM, LLC"],
  "EF Hutton LLC": ["EF Hutton","E.F. Hutton"],
  "Aegis Capital Corp.": ["Aegis","Aegis Capital"],
  "Chardan Capital Markets, LLC": ["Chardan","Chardan Capital"],
  "Ladenburg Thalmann & Co. Inc.": ["Ladenburg","Ladenburg Thalmann"],
  "Canaccord Genuity LLC": ["Canaccord","Canaccord Genuity"],
  "Jefferies LLC": ["Jefferies"],
  "BTIG, LLC": ["BTIG"],
  "Piper Sandler & Co.": ["Piper Sandler","Piper"],
  "Oppenheimer & Co. Inc.": ["Oppenheimer"],
  "Craig-Hallum Capital Group LLC": ["Craig-Hallum","Craig Hallum"],
  "B. Riley Securities, Inc.": ["B. Riley","B Riley"],
  "Raymond James & Associates, Inc.": ["Raymond James"],
  "Guggenheim Securities, LLC": ["Guggenheim"]
};

async function main() {
  for (const [name, aliases] of Object.entries(BANK_ALIASES)) {
    const bank = await prisma.bank.upsert({
      where: { name },
      update: {},
      create: { name, nameNormalized: name.toLowerCase() }
    });
    for (const alias of aliases) {
      await prisma.bankAlias.upsert({
        where: { alias },
        update: {},
        create: { alias, bankId: bank.id }
      });
    }
  }
}

main().finally(async()=>prisma.$disconnect());
