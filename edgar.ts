export function edgarDocUrls(cikNoPad: string, accession: string, primaryDoc: string) {
  const cik = cikNoPad.replace(/^0+/,"");
  const accNoDashes = accession.replace(/-/g,"");
  const base = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDashes}`;
  return { primaryUrl: `${base}/${primaryDoc}`, base };
}
