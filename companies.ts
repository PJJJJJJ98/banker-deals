import { Router } from "express";
import { prisma } from "../lib/prisma";
const r = Router();

r.get("/companies/:id/deals", async (req,res)=>{
  const id = req.params.id;
  const company = /^[0-9]+$/.test(id)
    ? await prisma.company.findUnique({ where: { cik: id } })
    : await prisma.company.findFirst({ where: { ticker: id.toUpperCase() } });
  if (!company) return res.status(404).json({ error: "not found" });

  const deals = await prisma.deal.findMany({
    where: { companyId: company.id },
    include: { participants: { include: { bank: true } } },
    orderBy: { createdAt: "desc" }
  });

  res.json({ company, deals });
});

export default r;
