import { Router } from "express";
import { prisma } from "../lib/prisma";
const r = Router();

r.get("/banks", async (req,res)=>{
  const { query, sinceDays="30" } = req.query as any;
  const since = new Date(Date.now()-parseInt(sinceDays)*24*3600*1000);
  const banks = await prisma.bank.findMany({
    where: query ? { OR: [{ name: { contains: query as string, mode:"insensitive"} }, { nameNormalized: { contains: (query as string).toLowerCase() }}] } : undefined,
    include: { participants: { include: { deal: true } } }
  });
  const data = banks.map(b => {
    const recent = b.participants.filter(p=> (p.deal?.createdAt||new Date(0)) >= since);
    return {
      id: b.id, name: b.name, nameNormalized: b.nameNormalized,
      deals30d: recent.length,
      dealsYTD: b.participants.filter(p=> (p.deal?.createdAt||new Date(0)).getFullYear() === new Date().getFullYear()).length
    };
  });
  res.json({ data });
});

export default r;
