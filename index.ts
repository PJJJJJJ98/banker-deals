import express from "express";
import cors from "cors";
import health from "./routes/health";
import deals from "./routes/deals";
import banks from "./routes/banks";
import companies from "./routes/companies";
import discoverAndIngest from "./jobs/discover";
import { ENV } from "./env";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", health);
app.use("/api", deals);
app.use("/api", banks);
app.use("/api", companies);

app.post("/internal/ingest", async (req, res) => {
  const auth = req.headers.authorization || "";
  if (ENV.API_TOKEN && auth !== `Bearer ${ENV.API_TOKEN}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  await discoverAndIngest();
  res.json({ ok: true });
});

app.listen(ENV.PORT, () => console.log(`API on :${ENV.PORT}`));
