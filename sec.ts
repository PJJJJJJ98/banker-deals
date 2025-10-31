import fetch from "node-fetch";
import { ENV } from "../env";

export async function fetchSubmissions(cik: string) {
  const padded = cik.padStart(10,"0");
  const res = await fetch(`https://data.sec.gov/submissions/CIK${padded}.json`, {
    headers: { "User-Agent": ENV.SEC_USER_AGENT }
  });
  if (!res.ok) throw new Error(`submissions ${res.status}`);
  return res.json();
}

export async function fetchHtml(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": ENV.SEC_USER_AGENT }});
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return res.text();
}

export async function secApiSearch(query: string, fromISO: string, toISO: string) {
  if (!ENV.SEC_API_KEY) return { hits: { hits: [] } };
  const res = await fetch("https://api.sec-api.io/search", {
    method: "POST",
    headers: { "x-api-key": ENV.SEC_API_KEY, "content-type":"application/json" },
    body: JSON.stringify({
      query: { query_string: { query: `${query} AND filedAt:[${fromISO} TO ${toISO}] AND formType:(8-K OR 424B5 OR 424B2 OR 424B3 OR FWP OR S-1 OR S-3 OR 6-K)` } },
      from: 0, size: 100, sort: [{ filedAt: { order: "desc" }}]
    })
  });
  if (!res.ok) throw new Error(`sec-api ${res.status}`);
  return res.json();
}
