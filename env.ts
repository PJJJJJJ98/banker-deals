import "dotenv/config";
export const ENV = {
  PORT: process.env.PORT || "8080",
  DATABASE_URL: process.env.DATABASE_URL || "",
  SEC_USER_AGENT: process.env.SEC_USER_AGENT || "BankerDealsRadar/1.0 (contact: ops@bankerdealsradar.com)",
  SEC_API_KEY: process.env.SEC_API_KEY || "",
  API_TOKEN: process.env.API_TOKEN || ""
};
