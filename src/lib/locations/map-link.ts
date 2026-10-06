import { Parser } from "htmlparser2";

export function normalizeGoogleMapLink(input: string): string | null {
  let value = input.trim();
  if (!value) return null;
  if (value.startsWith("<")) {
    const sources: string[] = [];
    const parser = new Parser({
      onopentag(name, attributes) {
        if (name === "iframe" && attributes.src) sources.push(attributes.src);
      },
    }, { decodeEntities: true });
    parser.end(value);
    if (sources.length !== 1) return null;
    value = sources[0];
  }
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const googleMap = /^(www\.|maps\.)?google\.(com|az)$/.test(host) &&
      (host.startsWith("maps.") || /^\/maps(?:\/|$)/.test(url.pathname));
    const shortMap = host === "maps.app.goo.gl" || (host === "goo.gl" && url.pathname.startsWith("/maps/"));
    return googleMap || shortMap ? url.href : null;
  } catch {
    return null;
  }
}

export function getGoogleMapEmbedUrl(input: string | null, address: string, coordinates?: [number, number]) {
  const link = input ? normalizeGoogleMapLink(input) : null;
  if (link) {
    const url = new URL(link);
    if (/^(www\.)?google\.(com|az)$/.test(url.hostname) && /^\/maps\/embed(?:\/|$)/.test(url.pathname)) return link;
    if (/^(www\.|maps\.)?google\.(com|az)$/.test(url.hostname)) {
      const query = url.searchParams.get("q") || url.searchParams.get("query");
      if (query) return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
      let decoded = url.pathname;
      try { decoded = decodeURIComponent(decoded); } catch { /* Keep malformed escapes as literal text. */ }
      const place = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
      const center = decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
      const pair = place || center;
      if (pair && Math.abs(Number(pair[1])) <= 90 && Math.abs(Number(pair[2])) <= 180) {
        return `https://www.google.com/maps?q=${encodeURIComponent(`${pair[1]},${pair[2]}`)}&output=embed`;
      }
      const name = decoded.match(/\/maps\/place\/([^/]+)/)?.[1]?.replaceAll("+", " ");
      if (name) return `https://www.google.com/maps?q=${encodeURIComponent(name)}&output=embed`;
    }
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(coordinates?.join(",") || address)}&output=embed`;
}
