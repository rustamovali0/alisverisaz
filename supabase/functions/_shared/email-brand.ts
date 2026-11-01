const escape = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));

/** Public PNG works in email clients that do not support SVG images. */
export function renderEmailBrand(origin: string, color = '#18382c') {
  const base = escape(origin.replace(/\/$/, ''));
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border-collapse:collapse"><tr><td style="width:48px;vertical-align:middle"><a href="${base}" style="text-decoration:none"><img src="${base}/brand/email-logo.png" width="48" height="48" alt="ALİSVERİS.AZ loqosu" style="display:block;width:48px;height:48px;border:0;border-radius:8px"></a></td><td style="padding-left:12px;vertical-align:middle"><a href="${base}" style="font-family:Arial,sans-serif;font-size:20px;font-weight:bold;text-decoration:none;color:${escape(color)}">ALİSVERİS.AZ</a></td></tr></table>`;
}
