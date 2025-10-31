import { Router } from "express";
import { prisma } from "../lib/prisma";

const r = Router();
r.get("/deals", async (req,res)=>{
  const { status, bank, dealType, q, page="1", pageSize="50" } = req.query as any;
  const p = Math.max(1, parseInt(page)); const ps = Math.min(200, parseInt(pageSize));

  const where:any = {};
  if (status) where.status = status;
  if (dealType) where.dealType = dealType;
  if (q) where.OR = [
    { notes: { contains: q, mode: "insensitive" } },
    { sourceSnippet: { contains: q, mode: "insensitive" } },
    { company: { name: { contains: q, mode: "insensitive" } } }
  ];
  if (bank) where.participants = { some: { bank: { nameNormalized: (bank as string).toLowerCase() } } };

  const [total, data] = await Promise.all([
    prisma.deal.count({ where }),
    prisma.deal.findMany({
      where,
      include: { company:true, participants: { include: { bank:true } } },
      orderBy: { createdAt: "desc" },
      skip: (p-1)*ps, take: ps
    })
  ]);

  res.json({ data, total, page:p, pageSize:ps });
});

export default r;
