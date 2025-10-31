import express from "express";
import cors from "cors";

// Routes (flat files)
import health from "./health";
import deals from "./deals";
import banks from "./banks";
import companies from "./companies";

// Jobs + env
import discoverAndIngest from "./discover";
import { ENV } from "./env";

const app = express();
app.use(cors());
app.use(express.json());

// Route registration
app.use("/api/health", health);
app.use("/api/deals", deals);
app.use("/api/banks", banks);
app.use("/api/companies", companies);

// Trigger data ingestion manually
app.post("/internal/ingest", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ENV.API_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await discoverAndIngest();
    res.json({ ok: true });
  } catch (err) {
    console.error("Ingest error", err);
    res.status(500).json({ error: "Failed to ingest" });
  }
});

const port = ENV.PORT || 8080;
app.listen(port, () => console.log(`✅ API running on port ${port}`));
