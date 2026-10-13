// 자동 생성 — 고치지 마세요. 본 저장소(jiwongeum-damoa)가 매시간 덮어씁니다.
// 원본: sync/radar/check.ts — 사용법: node tools/check.mjs

// sync/radar/check.ts
import { existsSync as existsSync2, readdirSync as readdirSync2, readFileSync as readFileSync2 } from "node:fs";
import { join as join2 } from "node:path";
import { parseArgs } from "node:util";

// src/lib/match/requirements.ts
var REQ_GROUPS = {
  basic: { label: "\uAE30\uCD08\uC0DD\uD65C\uC218\uAE09\uC790\xB7\uCC28\uC0C1\uC704", codes: ["JA0201"] },
  lowincome: { label: "\uC800\uC18C\uB4DD\uCE35", codes: ["JA0201", "JA0202"] },
  disabled: { label: "\uC7A5\uC560\uC778", codes: ["JA0328"] },
  veteran: { label: "\uAD6D\uAC00\uC720\uACF5\uC790\xB7\uBCF4\uD6C8\uB300\uC0C1", codes: ["JA0329"] },
  patient: { label: "\uC9C8\uBCD1\xB7\uC9C8\uD658\uC790", codes: ["JA0330"] },
  pregnant: { label: "\uC784\uC2E0\xB7\uCD9C\uC0B0", codes: ["JA0301", "JA0302", "JA0303"] },
  parent: { label: "\uC790\uB140 \uC591\uC721", codes: ["JA0411", "JA0403", "JA0303"], extras: ["child"] },
  student: { label: "\uD559\uC0DD", codes: ["JA0317", "JA0318", "JA0319", "JA0320"] },
  farmer: { label: "\uB18D\uC5B4\uC5C5\uC778", codes: ["JA0313", "JA0314", "JA0315", "JA0316"] },
  worker: { label: "\uADFC\uB85C\uC790\xB7\uC7AC\uC9C1\uC790", codes: ["JA0326"] },
  jobseeker: { label: "\uAD6C\uC9C1\uC790\xB7\uC2E4\uC5C5\uC790", codes: ["JA0327"] },
  singleparent: { label: "\uD55C\uBD80\uBAA8\xB7\uC870\uC190\uAC00\uC815", codes: ["JA0403"] },
  multicultural: { label: "\uB2E4\uBB38\uD654\uAC00\uC871", codes: ["JA0401"] },
  defector: { label: "\uBD81\uD55C\uC774\uD0C8\uC8FC\uBBFC", codes: ["JA0402"] },
  multichild: { label: "\uB2E4\uC790\uB140", codes: ["JA0411"] },
  nohome: { label: "\uBB34\uC8FC\uD0DD", codes: ["JA0412"] },
  oneperson: { label: "1\uC778 \uAC00\uAD6C", codes: ["JA0404"] },
  newcomer: { label: "\uC2E0\uADDC \uC804\uC785", codes: ["JA0413"] },
  business: { label: "\uC0AC\uC5C5\uC790\xB7\uC790\uC601\uC5C5\uC790", codes: [] },
  other: { label: "\uD2B9\uC815 \uB300\uC0C1", codes: [] }
};
var REQ_KEYS = Object.keys(REQ_GROUPS);

// src/lib/issues/hosts.ts
function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}
function isOfficialHost(host) {
  return host === "korea.kr" || host.endsWith(".korea.kr") || host === "go.kr" || host.endsWith(".go.kr");
}
var isOfficialUrl = (url) => isOfficialHost(hostOf(url));
var APPLY_AGENCY_SITES = [
  "semas.or.kr",
  // 소상공인시장진흥공단
  "sbiz24.kr",
  // 소상공인24
  "gov.kr",
  // 정부24
  "kosmes.or.kr"
  // 중소벤처기업진흥공단
];
var isAgencyHost = (host) => APPLY_AGENCY_SITES.some((d) => host === d || host.endsWith(`.${d}`));
var isApplyUrl = (url) => {
  const host = hostOf(url);
  return isOfficialHost(host) || isAgencyHost(host);
};
function trustOf(url) {
  const host = hostOf(url);
  return isOfficialHost(host) ? 2 : isAgencyHost(host) ? 1 : 0;
}
var SECOND_LEVEL = /^(?:co|or|ne|go|ac|re|pe|kr|com|net|org)\.[a-z]{2}$/;
function siteOf(host) {
  const parts = host.split(".");
  const n = parts.length >= 3 && SECOND_LEVEL.test(parts.slice(-2).join(".")) ? 3 : 2;
  return parts.slice(-n).join(".");
}

// src/lib/issues/phase.ts
function computePhase(d, today) {
  if (d.applyEnd && d.applyEnd < today) return "closed";
  if (d.stage !== "confirmed") return "reviewing";
  if (d.applyStart && d.applyStart <= today) return "open";
  return "planned";
}

// src/lib/issues/types.ts
var VERIFIABLE_FIELDS = ["agency", "target", "amount", "applyStart", "applyEnd", "applyMethod"];

// sync/radar/verify.ts
var ENTITIES = { nbsp: " ", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", middot: "\xB7", amp: "&" };
function htmlToText(html) {
  return html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&(nbsp|lt|gt|quot|apos|#39|middot|amp);/g, (_, n) => ENTITIES[n]).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/\s+/g, " ").trim();
}
function squash(s) {
  return s.replace(/[\s "'“”‘’`]/g, "").toLowerCase();
}
var DATE_IN_QUOTE = /(?:(\d{4})\s*(?:년|[./-])\s*)?(\d{1,2})\s*(?:월\s*(\d{1,2})\s*일|[./-]\s*(\d{1,2})(?=\s*(?:[.)(~–-]|부터|까지|$|\s)))/g;
function dateMentioned(quote, iso) {
  const [y, m, d] = iso.split("-").map(Number);
  for (const x of quote.matchAll(DATE_IN_QUOTE)) {
    if (x[1] && Number(x[1]) !== y) continue;
    if (Number(x[2]) === m && Number(x[3] ?? x[4]) === d) return true;
  }
  return false;
}
var numbersIn = (s) => new Set([...s.matchAll(/\d[\d,.]*/g)].map((m) => m[0].replace(/[,.]+$/, "").replace(/,/g, "")));
function valueSupported(field, value, quote) {
  if (field === "applyStart" || field === "applyEnd") return dateMentioned(quote, value);
  const q = squash(quote);
  if (field === "amount") {
    const nums = numbersIn(value);
    const quoted = numbersIn(quote);
    return nums.size > 0 && [...nums].every((n) => quoted.has(n));
  }
  if (field === "agency") return q.includes(squash(value));
  const words = value.split(/[\s,·/()]+/).map(squash).filter((w) => w.length >= 2);
  if (words.length === 0) return q.includes(squash(value));
  return words.filter((w) => q.includes(w)).length * 2 >= words.length;
}
var MIN_MEDIA_HOSTS = 3;
async function checkApplyUrl(url, names, relevantTexts, fetchText2, prevUrl) {
  if (url === null) return { url: null, note: null };
  if (!isApplyUrl(url)) return { url: null, note: `\uC2E0\uCCAD \uB9C1\uD06C\uAC00 \uACF5\uC2DD \uB3C4\uBA54\uC778(*.go.kr\xB7korea.kr)\uC774\uB098 \uC9C0\uC815 \uACF5\uACF5\uAE30\uAD00(${APPLY_AGENCY_SITES.join("\xB7")})\uC774 \uC544\uB2C8\uB77C \uBE8C` };
  let decoded = url;
  try {
    decoded = decodeURIComponent(url);
  } catch {
  }
  if (names.some((n) => squash(decoded).includes(n))) return { url: null, note: "\uC2E0\uCCAD \uB9C1\uD06C \uC8FC\uC18C\uC5D0 \uC774\uC288 \uC774\uB984\uC774 \uB4E4\uC5B4 \uC788\uC5B4(\uAC80\uC0C9 \uACB0\uACFC \uD398\uC774\uC9C0\uB85C \uBCF4\uC784) \uBE8C" };
  const text = await fetchText2(url).catch(() => null);
  if (text === null) {
    return prevUrl === url ? { url, note: "\uC2E0\uCCAD \uB9C1\uD06C\uB97C \uC5F4\uC9C0 \uBABB\uD568 \u2014 \uC9C1\uC804\uC5D0 \uD655\uC778\uB41C \uB9C1\uD06C\uB77C \uC720\uC9C0" } : { url: null, note: "\uC2E0\uCCAD \uB9C1\uD06C\uB97C \uC5F4\uC9C0 \uBABB\uD574 \uBE8C" };
  }
  const flat = squash(text);
  if (names.some((n) => flat.includes(n))) return { url, note: null };
  const site = squash(siteOf(hostOf(url)));
  if (!isOfficialUrl(url) && relevantTexts.some((t) => t.includes(site))) return { url, note: null };
  return { url: null, note: "\uC2E0\uCCAD \uB9C1\uD06C \uD398\uC774\uC9C0\uC5D0 \uC774\uC288 \uC774\uB984\uC774 \uC5C6\uACE0, \uCD9C\uCC98\uC5D0\uB3C4 \uADF8 \uC0AC\uC774\uD2B8 \uC8FC\uC18C\uAC00 \uC5C6\uC5B4 \uBE8C" };
}
async function verifyIssue(doc, fetchText2, today, now, prev = null) {
  if (doc.hidden) return { status: "hidden", issue: null, notes: ["\uC6B4\uC601\uC790\uAC00 \uC228\uAE40 \uCC98\uB9AC\uD568"] };
  const texts = await Promise.all(doc.sources.map((s) => fetchText2(s.url).catch(() => null)));
  if (texts.every((t) => t === null)) {
    return { status: "held", issue: null, notes: ["\uCD9C\uCC98\uB97C \uD558\uB098\uB3C4 \uC5F4\uC9C0 \uBABB\uD568 \u2014 \uC9C1\uC804 \uAC8C\uC2DC\uBCF8\uC744 \uC720\uC9C0\uD558\uACE0 \uB2E4\uC74C \uD68C\uCC28\uC5D0 \uB2E4\uC2DC \uD655\uC778"] };
  }
  const flat = texts.map((t) => t === null ? null : squash(t));
  const names = [doc.name, ...doc.aliases].map(squash).filter((n) => n.length >= 4);
  const relevant = flat.map((t) => t !== null && names.some((n) => t.includes(n)));
  const officialOk = doc.sources.some((s, i) => relevant[i] && isOfficialUrl(s.url));
  const mediaHosts = new Set(doc.sources.filter((s, i) => relevant[i] && !isOfficialUrl(s.url)).map((s) => siteOf(hostOf(s.url))));
  const someDown = texts.some((t) => t === null);
  const holdForOutage = (why) => ({
    status: "held",
    issue: null,
    notes: [`\uCD9C\uCC98 \uC77C\uBD80\uB97C \uC5F4\uC9C0 \uBABB\uD568 \u2014 ${why}. \uC9C1\uC804 \uAC8C\uC2DC\uBCF8\uC744 \uC720\uC9C0\uD558\uACE0 \uB2E4\uC74C \uD68C\uCC28\uC5D0 \uB2E4\uC2DC \uD655\uC778`]
  });
  if (!officialOk && mediaHosts.size < MIN_MEDIA_HOSTS) {
    if (prev && someDown) return holdForOutage("\uCD9C\uCC98 \uADDC\uCE59 \uBBF8\uB2EC");
    return {
      status: "rejected",
      issue: null,
      notes: [`\uCD9C\uCC98 \uADDC\uCE59 \uBBF8\uB2EC \u2014 \uACF5\uC2DD \uCD9C\uCC98 ${officialOk ? 1 : 0}\uACF3, \uC11C\uB85C \uB2E4\uB978 \uC5B8\uB860 ${mediaHosts.size}\uACF3 (\uACF5\uC2DD 1\uACF3 \uB610\uB294 \uC5B8\uB860 ${MIN_MEDIA_HOSTS}\uACF3 \uD544\uC694)`]
    };
  }
  const values = {
    agency: doc.agency,
    target: doc.target,
    amount: doc.amount,
    applyStart: doc.applyStart,
    applyEnd: doc.applyEnd,
    applyMethod: doc.applyMethod
  };
  const unverified = [];
  for (const field of VERIFIABLE_FIELDS) {
    const value = values[field];
    if (value === null) continue;
    const ok = (doc.evidence[field] ?? []).some((q) => {
      const text = flat[q.source];
      const quote = squash(q.quote);
      if (text == null || !relevant[q.source] || quote.length < 4 || !text.includes(quote)) return false;
      return valueSupported(field, value, q.quote);
    });
    if (!ok) {
      values[field] = null;
      unverified.push(field);
    }
  }
  const stage = doc.stage === "confirmed" && !officialOk ? "reviewing" : doc.stage;
  if (prev && someDown) {
    const lost = unverified.filter((f) => prev[f] !== null && !prev.unverified.includes(f));
    if (lost.length) return holdForOutage(`\uC9C1\uC804\uC5D0 \uD655\uC778\uB41C \uD56D\uBAA9(${lost.join(", ")})\uC758 \uADFC\uAC70\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD568`);
    if (prev.stage === "confirmed" && stage !== "confirmed") return holdForOutage("\uACF5\uC2DD \uCD9C\uCC98\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD568");
  }
  const notes = [];
  if (unverified.length) notes.push(`\uADFC\uAC70\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD574 '\uBBF8\uC815'\uC73C\uB85C \uD45C\uC2DC: ${unverified.join(", ")}`);
  if (stage !== doc.stage) notes.push('\uACF5\uC2DD \uCD9C\uCC98\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD574 "\uAC80\uD1A0 \uC911"\uC73C\uB85C \uD45C\uC2DC');
  const relevantTexts = flat.filter((t, i) => t !== null && relevant[i]);
  const apply = await checkApplyUrl(doc.applyUrl ?? null, names, relevantTexts, fetchText2, prev?.applyUrl ?? null);
  if (apply.note) notes.push(apply.note);
  const { evidence: _evidence, hidden: _hidden, sources, ...rest } = doc;
  const issue = {
    ...rest,
    ...values,
    applyUrl: apply.url,
    stage,
    phase: computePhase({ stage, applyStart: values.applyStart, applyEnd: values.applyEnd }, today),
    sources: sources.map((s, i) => ({ ...s, official: isOfficialUrl(s.url), reachable: texts[i] !== null })),
    unverified,
    verifiedAt: now
  };
  return { status: "published", issue, notes };
}

// sync/requirements/verify.ts
var MAX_CLAUSES = 6;
var MAX_KEYS = 8;
var QUOTE_MIN = 4;
var QUOTE_MAX = 300;
var fail = (error) => ({ ok: false, error });
function checkReqResult(raw, item) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fail("\uD615\uC2DD \uC624\uB958: \uACB0\uACFC\uAC00 \uAC1D\uCCB4\uAC00 \uC544\uB2D8");
  const r = raw;
  if (!item) return fail("\uD310\uB3C5 \uB300\uC0C1\uC774 \uC544\uB2D8 (id \uD655\uC778)");
  if (r.hash !== item.hash) return fail("\uC6D0\uBB38\uC774 \uBC14\uB01C \u2014 \uC0C8 \uBB36\uC74C\uC5D0\uC11C \uB2E4\uC2DC \uD310\uB3C5");
  if (!Array.isArray(r.clauses)) return fail("clauses \uBC30\uC5F4\uC774 \uC5C6\uC74C (\uC81C\uD55C\uC774 \uC5C6\uC73C\uBA74 \uBE48 \uBC30\uC5F4)");
  if (r.clauses.length > MAX_CLAUSES) return fail(`\uC870\uAC74 \uBB36\uC74C\uC774 ${MAX_CLAUSES}\uAC1C\uBCF4\uB2E4 \uB9CE\uC74C`);
  const text = squash(`${item.target}
${item.criteria}`);
  const clauses = [];
  for (const c of r.clauses) {
    if (!c || !Array.isArray(c.any) || c.any.length === 0 || c.any.length > MAX_KEYS) return fail("\uB0B1\uB9D0(any)\uC774 \uBE44\uC5C8\uAC70\uB098 \uB108\uBB34 \uB9CE\uC74C");
    const unknown = c.any.filter((k) => !REQ_KEYS.includes(k));
    if (unknown.length) return fail(`\uBAA8\uB974\uB294 \uB0B1\uB9D0: ${unknown.map(String).join(", ").slice(0, 60)}`);
    if (typeof c.quote !== "string" || squash(c.quote).length < QUOTE_MIN) return fail("\uADFC\uAC70(quote)\uAC00 \uC5C6\uAC70\uB098 \uB108\uBB34 \uC9E7\uC74C");
    if (c.quote.length > QUOTE_MAX) return fail(`\uADFC\uAC70(quote)\uAC00 ${QUOTE_MAX}\uC790\uBCF4\uB2E4 \uAE40`);
    if (!text.includes(squash(c.quote))) return fail(`\uC6D0\uBB38\uC5D0 \uC5C6\uB294 \uADFC\uAC70: "${c.quote.slice(0, 30)}"`);
    clauses.push({ any: [...new Set(c.any)], quote: c.quote });
  }
  return { ok: true, clauses };
}

// sync/requirements/radar.ts
var STALE_MS = 3 * 24 * 60 * 60 * 1e3;
function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function checkDoneFile(doneText, todoText) {
  if (todoText === null) return { ok: 0, errors: ["\uAC19\uC740 \uC774\uB984\uC758 req-todo \uBB36\uC74C\uC774 \uC5C6\uC74C (\uC774\uBBF8 \uAC00\uC838\uAC14\uAC70\uB098 \uD30C\uC77C \uC774\uB984\uC774 \uB2E4\uB984)"], missing: 0 };
  const done = parse(doneText);
  if (!done || !Array.isArray(done.results)) return { ok: 0, errors: ["\uD615\uC2DD \uC624\uB958: JSON \uC774 \uC544\uB2C8\uAC70\uB098 results \uBC30\uC5F4\uC774 \uC5C6\uC74C"], missing: 0 };
  const todo = parse(todoText);
  const items = new Map((todo?.items ?? []).map((i) => [i.id, i]));
  let ok = 0;
  const errors2 = [];
  const seen = /* @__PURE__ */ new Set();
  for (const raw of done.results) {
    const id = typeof raw?.id === "string" ? raw.id : "";
    seen.add(id);
    const check = checkReqResult(raw, items.get(id));
    if (check.ok) ok++;
    else errors2.push(`${id || "(id \uC5C6\uC74C)"}: ${check.error}`);
  }
  return { ok, errors: errors2, missing: [...items.keys()].filter((id) => !seen.has(id)).length };
}

// sync/radar/load.ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

// src/lib/regions-data.ts
var REGIONS = [
  { sido: "\uC11C\uC6B8", full: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC", aliases: ["\uC11C\uC6B8\uD2B9\uBCC4\uC2DC"], sigungu: [
    "\uC885\uB85C\uAD6C",
    "\uC911\uAD6C",
    "\uC6A9\uC0B0\uAD6C",
    "\uC131\uB3D9\uAD6C",
    "\uAD11\uC9C4\uAD6C",
    "\uB3D9\uB300\uBB38\uAD6C",
    "\uC911\uB791\uAD6C",
    "\uC131\uBD81\uAD6C",
    "\uAC15\uBD81\uAD6C",
    "\uB3C4\uBD09\uAD6C",
    "\uB178\uC6D0\uAD6C",
    "\uC740\uD3C9\uAD6C",
    "\uC11C\uB300\uBB38\uAD6C",
    "\uB9C8\uD3EC\uAD6C",
    "\uC591\uCC9C\uAD6C",
    "\uAC15\uC11C\uAD6C",
    "\uAD6C\uB85C\uAD6C",
    "\uAE08\uCC9C\uAD6C",
    "\uC601\uB4F1\uD3EC\uAD6C",
    "\uB3D9\uC791\uAD6C",
    "\uAD00\uC545\uAD6C",
    "\uC11C\uCD08\uAD6C",
    "\uAC15\uB0A8\uAD6C",
    "\uC1A1\uD30C\uAD6C",
    "\uAC15\uB3D9\uAD6C"
  ] },
  { sido: "\uBD80\uC0B0", full: "\uBD80\uC0B0\uAD11\uC5ED\uC2DC", aliases: ["\uBD80\uC0B0\uAD11\uC5ED\uC2DC"], sigungu: [
    "\uC911\uAD6C",
    "\uC11C\uAD6C",
    "\uB3D9\uAD6C",
    "\uC601\uB3C4\uAD6C",
    "\uBD80\uC0B0\uC9C4\uAD6C",
    "\uB3D9\uB798\uAD6C",
    "\uB0A8\uAD6C",
    "\uBD81\uAD6C",
    "\uD574\uC6B4\uB300\uAD6C",
    "\uC0AC\uD558\uAD6C",
    "\uAE08\uC815\uAD6C",
    "\uAC15\uC11C\uAD6C",
    "\uC5F0\uC81C\uAD6C",
    "\uC218\uC601\uAD6C",
    "\uC0AC\uC0C1\uAD6C",
    "\uAE30\uC7A5\uAD70"
  ] },
  { sido: "\uB300\uAD6C", full: "\uB300\uAD6C\uAD11\uC5ED\uC2DC", aliases: ["\uB300\uAD6C\uAD11\uC5ED\uC2DC"], sigungu: [
    "\uC911\uAD6C",
    "\uB3D9\uAD6C",
    "\uC11C\uAD6C",
    "\uB0A8\uAD6C",
    "\uBD81\uAD6C",
    "\uC218\uC131\uAD6C",
    "\uB2EC\uC11C\uAD6C",
    "\uB2EC\uC131\uAD70",
    "\uAD70\uC704\uAD70"
  ] },
  {
    sido: "\uC778\uCC9C",
    full: "\uC778\uCC9C\uAD11\uC5ED\uC2DC",
    aliases: ["\uC778\uCC9C\uAD11\uC5ED\uC2DC"],
    sigungu: [
      "\uC81C\uBB3C\uD3EC\uAD6C",
      "\uC601\uC885\uAD6C",
      "\uBBF8\uCD94\uD640\uAD6C",
      "\uC5F0\uC218\uAD6C",
      "\uB0A8\uB3D9\uAD6C",
      "\uBD80\uD3C9\uAD6C",
      "\uACC4\uC591\uAD6C",
      "\uC11C\uD574\uAD6C",
      "\uAC80\uB2E8\uAD6C",
      "\uAC15\uD654\uAD70",
      "\uC639\uC9C4\uAD70"
    ],
    sigunguAliases: { "\uB3D9\uAD6C": "\uC81C\uBB3C\uD3EC\uAD6C", "\uC911\uAD6C": "?", "\uB0A8\uAD6C": "\uBBF8\uCD94\uD640\uAD6C", "\uC11C\uAD6C": "\uC11C\uD574\uAD6C" }
  },
  { sido: "\uB300\uC804", full: "\uB300\uC804\uAD11\uC5ED\uC2DC", aliases: ["\uB300\uC804\uAD11\uC5ED\uC2DC"], sigungu: [
    "\uB3D9\uAD6C",
    "\uC911\uAD6C",
    "\uC11C\uAD6C",
    "\uC720\uC131\uAD6C",
    "\uB300\uB355\uAD6C"
  ] },
  { sido: "\uC6B8\uC0B0", full: "\uC6B8\uC0B0\uAD11\uC5ED\uC2DC", aliases: ["\uC6B8\uC0B0\uAD11\uC5ED\uC2DC"], sigungu: [
    "\uC911\uAD6C",
    "\uB0A8\uAD6C",
    "\uB3D9\uAD6C",
    "\uBD81\uAD6C",
    "\uC6B8\uC8FC\uAD70"
  ] },
  { sido: "\uC138\uC885", full: "\uC138\uC885\uD2B9\uBCC4\uC790\uCE58\uC2DC", aliases: ["\uC138\uC885\uD2B9\uBCC4\uC790\uCE58\uC2DC", "\uC138\uC885\uC2DC"], sigungu: [] },
  { sido: "\uACBD\uAE30", full: "\uACBD\uAE30\uB3C4", aliases: ["\uACBD\uAE30\uB3C4"], sigungu: [
    "\uC218\uC6D0\uC2DC",
    "\uC131\uB0A8\uC2DC",
    "\uC758\uC815\uBD80\uC2DC",
    "\uC548\uC591\uC2DC",
    "\uBD80\uCC9C\uC2DC",
    "\uAD11\uBA85\uC2DC",
    "\uD3C9\uD0DD\uC2DC",
    "\uB3D9\uB450\uCC9C\uC2DC",
    "\uC548\uC0B0\uC2DC",
    "\uACE0\uC591\uC2DC",
    "\uACFC\uCC9C\uC2DC",
    "\uAD6C\uB9AC\uC2DC",
    "\uB0A8\uC591\uC8FC\uC2DC",
    "\uC624\uC0B0\uC2DC",
    "\uC2DC\uD765\uC2DC",
    "\uAD70\uD3EC\uC2DC",
    "\uC758\uC655\uC2DC",
    "\uD558\uB0A8\uC2DC",
    "\uC6A9\uC778\uC2DC",
    "\uD30C\uC8FC\uC2DC",
    "\uC774\uCC9C\uC2DC",
    "\uC548\uC131\uC2DC",
    "\uAE40\uD3EC\uC2DC",
    "\uD654\uC131\uC2DC",
    "\uAD11\uC8FC\uC2DC",
    "\uC591\uC8FC\uC2DC",
    "\uD3EC\uCC9C\uC2DC",
    "\uC5EC\uC8FC\uC2DC",
    "\uC5F0\uCC9C\uAD70",
    "\uAC00\uD3C9\uAD70",
    "\uC591\uD3C9\uAD70"
  ] },
  { sido: "\uAC15\uC6D0", full: "\uAC15\uC6D0\uD2B9\uBCC4\uC790\uCE58\uB3C4", aliases: ["\uAC15\uC6D0\uD2B9\uBCC4\uC790\uCE58\uB3C4", "\uAC15\uC6D0\uB3C4"], sigungu: [
    "\uCD98\uCC9C\uC2DC",
    "\uC6D0\uC8FC\uC2DC",
    "\uAC15\uB989\uC2DC",
    "\uB3D9\uD574\uC2DC",
    "\uD0DC\uBC31\uC2DC",
    "\uC18D\uCD08\uC2DC",
    "\uC0BC\uCC99\uC2DC",
    "\uD64D\uCC9C\uAD70",
    "\uD6A1\uC131\uAD70",
    "\uC601\uC6D4\uAD70",
    "\uD3C9\uCC3D\uAD70",
    "\uC815\uC120\uAD70",
    "\uCCA0\uC6D0\uAD70",
    "\uD654\uCC9C\uAD70",
    "\uC591\uAD6C\uAD70",
    "\uC778\uC81C\uAD70",
    "\uACE0\uC131\uAD70",
    "\uC591\uC591\uAD70"
  ] },
  { sido: "\uCDA9\uBD81", full: "\uCDA9\uCCAD\uBD81\uB3C4", aliases: ["\uCDA9\uCCAD\uBD81\uB3C4"], sigungu: [
    "\uCCAD\uC8FC\uC2DC",
    "\uCDA9\uC8FC\uC2DC",
    "\uC81C\uCC9C\uC2DC",
    "\uBCF4\uC740\uAD70",
    "\uC625\uCC9C\uAD70",
    "\uC601\uB3D9\uAD70",
    "\uC99D\uD3C9\uAD70",
    "\uC9C4\uCC9C\uAD70",
    "\uAD34\uC0B0\uAD70",
    "\uC74C\uC131\uAD70",
    "\uB2E8\uC591\uAD70"
  ] },
  { sido: "\uCDA9\uB0A8", full: "\uCDA9\uCCAD\uB0A8\uB3C4", aliases: ["\uCDA9\uCCAD\uB0A8\uB3C4"], sigungu: [
    "\uCC9C\uC548\uC2DC",
    "\uACF5\uC8FC\uC2DC",
    "\uBCF4\uB839\uC2DC",
    "\uC544\uC0B0\uC2DC",
    "\uC11C\uC0B0\uC2DC",
    "\uB17C\uC0B0\uC2DC",
    "\uACC4\uB8E1\uC2DC",
    "\uB2F9\uC9C4\uC2DC",
    "\uAE08\uC0B0\uAD70",
    "\uBD80\uC5EC\uAD70",
    "\uC11C\uCC9C\uAD70",
    "\uCCAD\uC591\uAD70",
    "\uD64D\uC131\uAD70",
    "\uC608\uC0B0\uAD70",
    "\uD0DC\uC548\uAD70"
  ] },
  { sido: "\uC804\uBD81", full: "\uC804\uBD81\uD2B9\uBCC4\uC790\uCE58\uB3C4", aliases: ["\uC804\uBD81\uD2B9\uBCC4\uC790\uCE58\uB3C4", "\uC804\uB77C\uBD81\uB3C4"], sigungu: [
    "\uC804\uC8FC\uC2DC",
    "\uAD70\uC0B0\uC2DC",
    "\uC775\uC0B0\uC2DC",
    "\uC815\uC74D\uC2DC",
    "\uB0A8\uC6D0\uC2DC",
    "\uAE40\uC81C\uC2DC",
    "\uC644\uC8FC\uAD70",
    "\uC9C4\uC548\uAD70",
    "\uBB34\uC8FC\uAD70",
    "\uC7A5\uC218\uAD70",
    "\uC784\uC2E4\uAD70",
    "\uC21C\uCC3D\uAD70",
    "\uACE0\uCC3D\uAD70",
    "\uBD80\uC548\uAD70"
  ] },
  { sido: "\uC804\uB0A8\uAD11\uC8FC", full: "\uC804\uB0A8\uAD11\uC8FC\uD1B5\uD569\uD2B9\uBCC4\uC2DC", aliases: ["\uC804\uB0A8\uAD11\uC8FC\uD1B5\uD569\uD2B9\uBCC4\uC2DC", "\uAD11\uC8FC\uAD11\uC5ED\uC2DC", "\uC804\uB77C\uB0A8\uB3C4"], sigungu: [
    "\uB3D9\uAD6C",
    "\uC11C\uAD6C",
    "\uB0A8\uAD6C",
    "\uBD81\uAD6C",
    "\uAD11\uC0B0\uAD6C",
    "\uBAA9\uD3EC\uC2DC",
    "\uC5EC\uC218\uC2DC",
    "\uC21C\uCC9C\uC2DC",
    "\uB098\uC8FC\uC2DC",
    "\uAD11\uC591\uC2DC",
    "\uB2F4\uC591\uAD70",
    "\uACE1\uC131\uAD70",
    "\uAD6C\uB840\uAD70",
    "\uACE0\uD765\uAD70",
    "\uBCF4\uC131\uAD70",
    "\uD654\uC21C\uAD70",
    "\uC7A5\uD765\uAD70",
    "\uAC15\uC9C4\uAD70",
    "\uD574\uB0A8\uAD70",
    "\uC601\uC554\uAD70",
    "\uBB34\uC548\uAD70",
    "\uD568\uD3C9\uAD70",
    "\uC601\uAD11\uAD70",
    "\uC7A5\uC131\uAD70",
    "\uC644\uB3C4\uAD70",
    "\uC9C4\uB3C4\uAD70",
    "\uC2E0\uC548\uAD70"
  ] },
  { sido: "\uACBD\uBD81", full: "\uACBD\uC0C1\uBD81\uB3C4", aliases: ["\uACBD\uC0C1\uBD81\uB3C4"], sigungu: [
    "\uD3EC\uD56D\uC2DC",
    "\uACBD\uC8FC\uC2DC",
    "\uAE40\uCC9C\uC2DC",
    "\uC548\uB3D9\uC2DC",
    "\uAD6C\uBBF8\uC2DC",
    "\uC601\uC8FC\uC2DC",
    "\uC601\uCC9C\uC2DC",
    "\uC0C1\uC8FC\uC2DC",
    "\uBB38\uACBD\uC2DC",
    "\uACBD\uC0B0\uC2DC",
    "\uC758\uC131\uAD70",
    "\uCCAD\uC1A1\uAD70",
    "\uC601\uC591\uAD70",
    "\uC601\uB355\uAD70",
    "\uCCAD\uB3C4\uAD70",
    "\uACE0\uB839\uAD70",
    "\uC131\uC8FC\uAD70",
    "\uCE60\uACE1\uAD70",
    "\uC608\uCC9C\uAD70",
    "\uBD09\uD654\uAD70",
    "\uC6B8\uC9C4\uAD70",
    "\uC6B8\uB989\uAD70"
  ] },
  { sido: "\uACBD\uB0A8", full: "\uACBD\uC0C1\uB0A8\uB3C4", aliases: ["\uACBD\uC0C1\uB0A8\uB3C4"], sigungu: [
    "\uCC3D\uC6D0\uC2DC",
    "\uC9C4\uC8FC\uC2DC",
    "\uD1B5\uC601\uC2DC",
    "\uC0AC\uCC9C\uC2DC",
    "\uAE40\uD574\uC2DC",
    "\uBC00\uC591\uC2DC",
    "\uAC70\uC81C\uC2DC",
    "\uC591\uC0B0\uC2DC",
    "\uC758\uB839\uAD70",
    "\uD568\uC548\uAD70",
    "\uCC3D\uB155\uAD70",
    "\uACE0\uC131\uAD70",
    "\uB0A8\uD574\uAD70",
    "\uD558\uB3D9\uAD70",
    "\uC0B0\uCCAD\uAD70",
    "\uD568\uC591\uAD70",
    "\uAC70\uCC3D\uAD70",
    "\uD569\uCC9C\uAD70"
  ] },
  { sido: "\uC81C\uC8FC", full: "\uC81C\uC8FC\uD2B9\uBCC4\uC790\uCE58\uB3C4", aliases: ["\uC81C\uC8FC\uD2B9\uBCC4\uC790\uCE58\uB3C4", "\uC81C\uC8FC\uB3C4"], sigungu: ["\uC81C\uC8FC\uC2DC", "\uC11C\uADC0\uD3EC\uC2DC"] }
];

// src/lib/regions.ts
var ALIASES = REGIONS.flatMap((region) => region.aliases.map((alias) => ({ region, alias }))).sort((a, b) => b.alias.length - a.alias.length);

// src/lib/issues/validate.ts
var SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var STAGES = ["reviewing", "confirmed"];
var GROUPS = ["personal", "smallbiz", "corp", "all"];
var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var isStr = (v, max = 300) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
var isNullableStr = (v, max = 300) => v === null || isStr(v, max);
function isIsoDate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = /* @__PURE__ */ new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
function validateIssueDoc(raw, fileSlug) {
  if (!isObj(raw)) return { ok: false, errors: ["JSON \uAC1D\uCCB4\uAC00 \uC544\uB2D8"] };
  const r = raw;
  const e = [];
  if (typeof r.slug !== "string" || !SLUG_RE.test(r.slug) || r.slug.length > 80) e.push("slug: \uC601\uBB38 \uC18C\uBB38\uC790\xB7\uC22B\uC790\xB7\uD558\uC774\uD508\uB9CC (80\uC790 \uC774\uD558)");
  else if (r.slug !== fileSlug) e.push(`slug(${r.slug})\uAC00 \uD30C\uC77C \uC774\uB984(${fileSlug})\uACFC \uB2E4\uB984`);
  if (!isStr(r.name, 60)) e.push("name: 1~60\uC790");
  if (!Array.isArray(r.aliases) || r.aliases.length > 10 || !r.aliases.every((a) => isStr(a, 60))) e.push("aliases: \uBB38\uC790\uC5F4 \uBC30\uC5F4 (10\uAC1C \uC774\uD558)");
  if (typeof r.summary !== "string" || r.summary.trim().length < 20 || r.summary.length > 400) e.push("summary: 20~400\uC790");
  if (!STAGES.includes(r.stage)) e.push("stage: reviewing | confirmed");
  if (typeof r.hidden !== "boolean") e.push("hidden: true | false");
  for (const k of ["agency", "target", "amount", "applyMethod"]) {
    if (!isNullableStr(r[k])) e.push(`${k}: 300\uC790 \uC774\uD558 \uBB38\uC790\uC5F4 \uB610\uB294 null`);
  }
  if (!GROUPS.includes(r.targetGroup)) e.push("targetGroup: personal | smallbiz | corp | all");
  if (!isNullableStr(r.gov24Id, 40)) e.push("gov24Id: \uBB38\uC790\uC5F4 \uB610\uB294 null");
  const applyUrl = r.applyUrl ?? null;
  if (applyUrl !== null && !(isStr(applyUrl) && /^https:\/\/[^\s]+$/.test(applyUrl))) e.push("applyUrl: https \uC8FC\uC18C(300\uC790 \uC774\uD558) \uB610\uB294 null");
  if (!isObj(r.region)) {
    e.push("region: { sido, sigungu }");
  } else {
    const { sido, sigungu } = r.region;
    const region = typeof sido === "string" ? REGIONS.find((x) => x.sido === sido) : void 0;
    if (sido !== null && !region) e.push(`region.sido: ${REGIONS.map((x) => x.sido).join("\xB7")} \uC911 \uD558\uB098 \uB610\uB294 null`);
    if (sigungu !== null && (!region || typeof sigungu !== "string" || !region.sigungu.includes(sigungu))) {
      e.push("region.sigungu: \uD574\uB2F9 \uC2DC\uB3C4\uC758 \uC2DC\uAD70\uAD6C \uC774\uB984 \uB610\uB294 null");
    }
  }
  for (const k of ["applyStart", "applyEnd"]) {
    if (r[k] !== null && !isIsoDate(r[k])) e.push(`${k}: YYYY-MM-DD \uB610\uB294 null`);
  }
  if (isIsoDate(r.applyStart) && isIsoDate(r.applyEnd) && r.applyStart > r.applyEnd) e.push("applyStart\uAC00 applyEnd\uBCF4\uB2E4 \uB2A6\uC74C");
  for (const k of ["ageMin", "ageMax"]) {
    const v = r[k];
    if (v !== null && !(typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 120)) e.push(`${k}: 0~120 \uC815\uC218 \uB610\uB294 null`);
  }
  const sources = Array.isArray(r.sources) ? r.sources : null;
  if (!sources || sources.length < 1 || sources.length > 10) {
    e.push("sources: 1~10\uAC1C");
  } else {
    sources.forEach((s, i) => {
      if (!isObj(s) || typeof s.url !== "string" || !/^https?:\/\//.test(s.url) || !isStr(s.title, 200) || !isStr(s.publisher, 60)) {
        e.push(`sources[${i}]: { url(http/https), title, publisher }`);
      }
    });
  }
  const sourceCount = sources?.length ?? 0;
  if (!isObj(r.evidence)) {
    e.push("evidence: \uAC1D\uCCB4");
  } else {
    for (const [field, quotes] of Object.entries(r.evidence)) {
      if (!VERIFIABLE_FIELDS.includes(field)) {
        e.push(`evidence.${field}: \uADFC\uAC70 \uB300\uC0C1 \uD56D\uBAA9\uC774 \uC544\uB2D8 (${VERIFIABLE_FIELDS.join(", ")})`);
        continue;
      }
      const ok = Array.isArray(quotes) && quotes.every((q) => isObj(q) && typeof q.source === "number" && Number.isInteger(q.source) && q.source >= 0 && q.source < sourceCount && typeof q.quote === "string" && q.quote.trim().length >= 4 && q.quote.length <= 200);
      if (!ok) e.push(`evidence.${field}: [{ source: \uCD9C\uCC98 \uBC88\uD638(0~${sourceCount - 1}), quote: 4~200\uC790 }]`);
    }
  }
  for (const k of ["createdAt", "updatedAt"]) {
    if (typeof r[k] !== "string" || Number.isNaN(Date.parse(r[k]))) e.push(`${k}: ISO \uC2DC\uAC01`);
  }
  return e.length ? { ok: false, errors: e } : { ok: true, doc: { ...r, applyUrl } };
}

// src/lib/posts/validate.ts
var KINDS = ["guide", "explainer"];
var BODY_MIN = 600;
var BODY_MAX = 12e3;
var isObj2 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var isStr2 = (v, min, max) => typeof v === "string" && v.trim().length >= min && v.length <= max;
var isIsoTime = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v));
var strList = (v, max, min = 1, len = 80) => Array.isArray(v) && v.length <= max && v.every((x) => isStr2(x, min, len));
function bodyLinks(body) {
  return [...body.matchAll(/\[[^\]\n]*\]\(([^)\s]*)\)/g)].map((m) => m[1]);
}
function isAllowedLink(url) {
  if (/^\/(?!\/)[^\s"'<>\\]*$/.test(url)) return true;
  return /^https:\/\/[^\s"'<>\\]+$/.test(url) && isApplyUrl(url);
}
function validatePostDoc(raw, fileSlug) {
  if (!isObj2(raw)) return { ok: false, errors: ["JSON \uAC1D\uCCB4\uAC00 \uC544\uB2D8"] };
  const r = raw;
  const e = [];
  if (typeof r.slug !== "string" || !SLUG_RE.test(r.slug) || r.slug.length > 80) e.push("slug: \uC601\uBB38 \uC18C\uBB38\uC790\xB7\uC22B\uC790\xB7\uD558\uC774\uD508\uB9CC (80\uC790 \uC774\uD558)");
  else if (r.slug !== fileSlug) e.push(`slug(${r.slug})\uAC00 \uD30C\uC77C \uC774\uB984(${fileSlug})\uACFC \uB2E4\uB984`);
  if (!KINDS.includes(r.kind)) e.push("kind: guide | explainer");
  if (!isStr2(r.title, 10, 60)) e.push("title: 10~60\uC790");
  if (!isStr2(r.description, 50, 160)) e.push("description: 50~160\uC790");
  if (!isStr2(r.topic, 2, 60)) e.push("topic: 2~60\uC790");
  if (!strList(r.names, 5, 3, 40) || r.names.length < 1) e.push("names: 1~5\uAC1C, \uAC01 3~40\uC790");
  if (!isObj2(r.related) || !strList(r.related.benefits, 5) || !strList(r.related.issues, 3)) {
    e.push("related: { benefits: \uC9C0\uC6D0\uAE08 ID 5\uAC1C\uAE4C\uC9C0, issues: \uC774\uC288 slug 3\uAC1C\uAE4C\uC9C0 }");
  } else if (r.kind === "explainer" && r.related.issues.length === 0) {
    e.push("related.issues: \uD574\uC124 \uAE00(explainer)\uC740 \uAD00\uB828 \uC774\uC288 slug \uAC00 \uD558\uB098 \uC774\uC0C1 \uD544\uC694");
  }
  if (typeof r.body !== "string" || r.body.trim().length < BODY_MIN || r.body.length > BODY_MAX) {
    e.push(`body: ${BODY_MIN}~${BODY_MAX}\uC790`);
  } else {
    if (/<\/?[a-z!][^>]*>/i.test(r.body)) e.push("body: HTML \uD0DC\uADF8\uB294 \uC4F8 \uC218 \uC5C6\uC74C (\uB9C8\uD06C\uB2E4\uC6B4 \uC77C\uBD80\uB9CC)");
    const bad = bodyLinks(r.body).filter((u) => !isAllowedLink(u));
    if (bad.length) e.push(`body: \uB9C1\uD06C\uB294 \uC0AC\uC774\uD2B8 \uC548(/\u2026) \uB610\uB294 \uACF5\uC2DD \uB204\uB9AC\uC9D1(https, *.go.kr\xB7korea.kr\xB7\uC9C0\uC815 \uACF5\uACF5\uAE30\uAD00)\uB9CC \u2014 ${bad.slice(0, 3).join(", ")}`);
  }
  const sources = Array.isArray(r.sources) ? r.sources : null;
  if (!sources || sources.length < 1 || sources.length > 10) {
    e.push("sources: 1~10\uAC1C");
  } else {
    sources.forEach((s, i) => {
      if (!isObj2(s) || typeof s.url !== "string" || !/^https?:\/\//.test(s.url) || !isStr2(s.title, 1, 200) || !isStr2(s.publisher, 1, 60)) {
        e.push(`sources[${i}]: { url(http/https), title, publisher }`);
      }
    });
  }
  const n = sources?.length ?? 0;
  const factsOk = Array.isArray(r.facts) && r.facts.length <= 60 && r.facts.every((q) => isObj2(q) && typeof q.source === "number" && Number.isInteger(q.source) && q.source >= 0 && q.source < n && typeof q.quote === "string" && q.quote.trim().length >= 4 && q.quote.length <= 200);
  if (!factsOk) e.push(`facts: [{ source: \uCD9C\uCC98 \uBC88\uD638(0~${Math.max(n - 1, 0)}), quote: 4~200\uC790 }] 60\uAC1C\uAE4C\uC9C0`);
  if (typeof r.hidden !== "boolean") e.push("hidden: true | false");
  for (const k of ["publishAt", "createdAt", "updatedAt"]) {
    if (!isIsoTime(r[k])) e.push(`${k}: ISO \uC2DC\uAC01 (\uC608: 2026-10-14T00:00:00Z)`);
  }
  return e.length ? { ok: false, errors: e } : { ok: true, doc: r };
}

// sync/radar/load.ts
function loadIssueDocs(dir) {
  return loadDocs(dir, validateIssueDoc);
}
function loadPostDocs(dir) {
  return loadDocs(dir, validatePostDoc);
}
function loadDocs(dir, validate) {
  const out = { docs: [], errors: [] };
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    let raw;
    try {
      raw = JSON.parse(readFileSync(join(dir, file), "utf8"));
    } catch (err) {
      out.errors.push({ file, errors: [`JSON \uBB38\uBC95 \uC624\uB958: ${String(err).slice(0, 200)}`] });
      continue;
    }
    const r = validate(raw, basename(file, ".json"));
    if (r.ok) out.docs.push(r.doc);
    else out.errors.push({ file, errors: r.errors });
  }
  return out;
}
function offlineFetcher(dir) {
  const map = JSON.parse(readFileSync(join(dir, "pages.json"), "utf8"));
  return async (url) => map[url] ? htmlToText(readFileSync(join(dir, map[url]), "utf8")) : null;
}

// sync/radar/verify-post.ts
var UNIT = "\uB9CC\\s*\uC6D0|\uC5B5\\s*\uC6D0|\uCC9C\\s*\uC6D0|\uC6D0|\uB9CC|\uC5B5|\uCC9C|%|\uD37C\uC13C\uD2B8|\uC138|\uC0B4|\uB144|\uAC1C\uC6D4|\uC6D4|\uC77C|\uC8FC|\uC2DC\uAC04|\uBA85|\uAC00\uAD6C|\uD68C|\uBC30|\uC778|\uACF3|\uAC74|\uAC1C|\uCC28|\uB4F1\uAE09|\uC21C\uC704";
var NUMBER = new RegExp(`(\\d[\\d,.]*\\d|\\d)(\\s*(?:${UNIT}))?`, "g");
function numberTokens(text) {
  const visible = text.replace(/\]\([^)\s]*\)/g, "]").replace(/^\s*\d{1,2}[.)]\s+/gm, "");
  return [...visible.matchAll(NUMBER)].map((m) => (m[1] + (m[2] ?? "")).replace(/\s+/g, ""));
}
var escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function quoteHas(quoteSquashed, token) {
  const tail = /\d$/.test(token) ? "(?![\\d])" : "";
  return new RegExp(`(?<![\\d.,])${escapeRe(token.toLowerCase())}${tail}`).test(quoteSquashed);
}
var COPY_SPAN = 50;
var SHINGLE = 25;
function copiedFrom(bodyFlat, sourceFlat) {
  const blocks = /* @__PURE__ */ new Set();
  for (let p = 0; p + SHINGLE <= sourceFlat.length; p += SHINGLE) blocks.add(sourceFlat.slice(p, p + SHINGLE));
  for (let i = 0; i + SHINGLE <= bodyFlat.length; i++) {
    if (!blocks.has(bodyFlat.slice(i, i + SHINGLE))) continue;
    for (let s = Math.max(0, i - SHINGLE); s <= i; s++) {
      const span = bodyFlat.slice(s, s + COPY_SPAN);
      if (span.length === COPY_SPAN && sourceFlat.includes(span)) return span;
    }
  }
  return null;
}
var AI_TRACE = ["\uC5B8\uC5B4\uBAA8\uB378", "AI\uBAA8\uB378\uB85C\uC11C", "asanai", "chatgpt", "\uB3C4\uC6C0\uC774\uB418\uC168", "\uAD81\uAE08\uD55C\uC810\uC774\uC788\uC73C\uC2DC\uBA74\uC5B8\uC81C\uB4E0", "\uC81C\uAC00\uC54C\uB824\uB4DC\uB9B4"];
var HYPE_TITLE = ["!", "\uFF01", "\uBB34\uC870\uAC74", "\uCDA9\uACA9", "\uB300\uBC15", "\uBAA8\uB974\uBA74\uC190\uD574", "\uB193\uCE58\uBA74\uC190\uD574", "\uAF2D\uBC1B\uC73C\uC138\uC694", "100%"];
var IMPERSONATE = ["\uC815\uBD80\uACF5\uC2DD\uC0AC\uC774\uD2B8", "\uC815\uBD80\uACF5\uC2DD\uBE14\uB85C\uADF8", "\uACF5\uC2DD\uC9C0\uC6D0\uAE08\uB2E4\uBAA8\uC544", "\uC815\uBD80\uAC00\uC6B4\uC601\uD558\uB294"];
async function verifyPost(doc, fetchText2) {
  const texts = await Promise.all(doc.sources.map((s) => fetchText2(s.url).catch(() => null)));
  const sources = doc.sources.map((s) => ({ ...s, official: isOfficialUrl(s.url) }));
  if (texts.every((t) => t === null)) return { status: "held", sources, notes: ["\uCD9C\uCC98\uB97C \uD558\uB098\uB3C4 \uC5F4\uC9C0 \uBABB\uD568 \u2014 \uB2E4\uC74C \uD68C\uCC28\uC5D0 \uB2E4\uC2DC \uD655\uC778"] };
  const someDown = texts.some((t) => t === null);
  const flat = texts.map((t) => t === null ? null : squash(t));
  const names = doc.names.map(squash).filter((n) => n.length >= 3);
  const relevant = flat.map((t) => t !== null && names.some((n) => t.includes(n)));
  const notes = [];
  if (!sources.some((s, i) => s.official && relevant[i])) {
    notes.push(`\uACF5\uC2DD \uCD9C\uCC98(*.go.kr\xB7korea.kr) \uC911 \uBCF8\uBB38\uC5D0 '${doc.names.join("', '")}'\uAC00 \uB098\uC624\uB294 \uACF3\uC774 \uC5C6\uC74C`);
  }
  const verified = doc.facts.filter((f) => relevant[f.source] && flat[f.source].includes(squash(f.quote)) && squash(f.quote).length >= 4).map((f) => squash(f.quote));
  const tokens = [...new Set(numberTokens(`${doc.title}
${doc.description}
${doc.body}`))];
  const missing = tokens.filter((t) => !verified.some((q) => quoteHas(q, t)));
  if (missing.length) notes.push(`\uCD9C\uCC98 \uC778\uC6A9(facts)\uC73C\uB85C \uD655\uC778\uB418\uC9C0 \uC54A\uC740 \uC22B\uC790: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? ` \uC678 ${missing.length - 10}\uAC1C` : ""}`);
  const bodyFlat = squash(doc.body.replace(/\]\([^)\s]*\)/g, "]").replace(/[#*[\]()-]/g, ""));
  for (const t of flat) {
    const span = t && copiedFrom(bodyFlat, t);
    if (span) {
      notes.push(`\uCD9C\uCC98 \uBB38\uC7A5\uC744 \uADF8\uB300\uB85C \uC62E\uAE40: "${span.slice(0, 30)}\u2026" \u2014 \uC9C1\uC811 \uD480\uC5B4 \uC4F4\uB2E4`);
      break;
    }
  }
  const all = squash(`${doc.title} ${doc.description} ${doc.body}`);
  const title = squash(doc.title);
  const ai = AI_TRACE.filter((w) => all.includes(w));
  if (ai.length) notes.push(`AI \uD754\uC801 \uBB38\uAD6C: ${ai.join(", ")}`);
  const hype = HYPE_TITLE.filter((w) => title.includes(w.toLowerCase()));
  if (hype.length) notes.push(`\uACFC\uC7A5\uB41C \uC81C\uBAA9: ${hype.join(", ")}`);
  const imp = IMPERSONATE.filter((w) => all.includes(w));
  if (imp.length) notes.push(`\uC815\uBD80 \uAE30\uAD00\uCC98\uB7FC \uBCF4\uC774\uB294 \uD45C\uD604: ${imp.join(", ")}`);
  if (notes.length === 0) return { status: "ok", sources, notes };
  return { status: someDown ? "held" : "rejected", sources, notes: someDown ? [...notes, "\uCD9C\uCC98 \uC77C\uBD80\uB97C \uC5F4\uC9C0 \uBABB\uD568 \u2014 \uB2E4\uC74C \uD68C\uCC28\uC5D0 \uB2E4\uC2DC \uD655\uC778"] : notes };
}

// sync/radar/fetch-page.ts
var MAX_BYTES = 3 * 1024 * 1024;
var KOREAN_LEGACY = ["euc-kr", "ks_c_5601-1987", "cp949", "x-windows-949", "ksc5601"];
function detectCharset(contentType, head) {
  const fromHeader = /charset=["']?([\w-]+)/i.exec(contentType ?? "")?.[1];
  const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  const cs = (fromHeader ?? fromMeta ?? "utf-8").toLowerCase();
  if (KOREAN_LEGACY.includes(cs)) return "euc-kr";
  return cs === "utf8" ? "utf-8" : cs;
}
var MAX_REDIRECTS = 5;
async function fetchPageText(url, fetchImpl = fetch) {
  try {
    const startTrust = trustOf(url);
    const signal = AbortSignal.timeout(2e4);
    let current = url;
    let res;
    for (let hop = 0; ; hop++) {
      res = await fetchImpl(current, {
        redirect: "manual",
        signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; jiwongeum-damoa-verifier/1.0)", "Accept-Language": "ko-KR,ko;q=0.9" }
      });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!location) break;
      if (hop >= MAX_REDIRECTS) return null;
      current = new URL(location, current).toString();
      if (trustOf(current) < startTrust) return null;
    }
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer()).slice(0, MAX_BYTES);
    const head = new TextDecoder("latin1").decode(buf.slice(0, 4096));
    let decoder;
    try {
      decoder = new TextDecoder(detectCharset(res.headers.get("content-type"), head));
    } catch {
      decoder = new TextDecoder("utf-8");
    }
    return htmlToText(decoder.decode(buf));
  } catch {
    return null;
  }
}

// src/lib/benefit-view.ts
function todayKst() {
  return new Date(Date.now() + 9 * 3600 * 1e3).toISOString().slice(0, 10);
}

// sync/radar/check.ts
var defaultDir = true ? "issues" : "content/issues";
var defaultPosts = true ? "posts" : "content/posts";
var { values: args } = parseArgs({
  options: {
    content: { type: "string", default: defaultDir },
    posts: { type: "string", default: defaultPosts },
    pages: { type: "string" },
    "req-todo": { type: "string", default: "req-todo" },
    "req-done": { type: "string", default: "req-done" }
  }
});
var { docs, errors } = loadIssueDocs(args.content);
var fetchText = args.pages ? offlineFetcher(args.pages) : (url) => fetchPageText(url);
for (const e of errors) console.log(`\u2717 ${e.file}
  - ${e.errors.join("\n  - ")}`);
for (const doc of docs) {
  const r = await verifyIssue(doc, fetchText, todayKst(), (/* @__PURE__ */ new Date()).toISOString());
  const partial = r.status === "published" && (r.issue.unverified.length > 0 || doc.applyUrl !== null && r.issue.applyUrl === null);
  const mark = r.status === "published" ? partial ? "\u25B3" : "\u2713" : r.status === "hidden" ? "\xB7" : "!";
  console.log(`${mark} ${doc.slug} \u2014 ${r.status}${r.status === "published" ? ` (${r.issue.phase})` : ""}`);
  for (const n of r.notes) console.log(`  - ${n}`);
}
console.log(`\uD615\uC2DD \uC624\uB958 ${errors.length}\uAC74 \xB7 \uAC80\uC0AC ${docs.length}\uAC74 (\u2713 \uD1B5\uACFC, \u25B3 \uC77C\uBD80 \uBBF8\uC815\xB7\uC2E0\uCCAD \uB9C1\uD06C \uBE60\uC9D0, ! \uAC8C\uC2DC \uC548 \uB428/\uBCF4\uB958)`);
var posts = loadPostDocs(args.posts);
for (const e of posts.errors) console.log(`\u2717 \uAE00 ${e.file}
  - ${e.errors.join("\n  - ")}`);
var postFails = 0;
for (const doc of posts.docs) {
  if (doc.hidden) {
    console.log(`\xB7 \uAE00 ${doc.slug} \u2014 \uC228\uAE40`);
    continue;
  }
  const r = await verifyPost(doc, fetchText);
  if (r.status !== "ok") postFails++;
  console.log(`${r.status === "ok" ? "\u2713" : "!"} \uAE00 ${doc.slug} \u2014 ${r.status === "ok" ? "\uAC8C\uC2DC \uAC00\uB2A5" : r.status === "held" ? "\uBCF4\uB958" : "\uAC8C\uC2DC \uC548 \uB428"}`);
  for (const n of r.notes) console.log(`  - ${n}`);
}
console.log(`\uAE00 \uD615\uC2DD \uC624\uB958 ${posts.errors.length}\uAC74 \xB7 \uAC80\uC0AC ${posts.docs.length}\uAC74 \xB7 \uAC8C\uC2DC \uC548 \uB428/\uBCF4\uB958 ${postFails}\uAC74`);
var reqFails = 0;
if (existsSync2(args["req-done"])) {
  for (const name of readdirSync2(args["req-done"]).filter((n) => n.endsWith(".json"))) {
    const todoPath = join2(args["req-todo"], name);
    const r = checkDoneFile(readFileSync2(join2(args["req-done"], name), "utf8"), existsSync2(todoPath) ? readFileSync2(todoPath, "utf8") : null);
    if (r.errors.length) reqFails++;
    console.log(`${r.errors.length ? "\u2717" : "\u2713"} \uC694\uAC74 ${name} \u2014 \uD1B5\uACFC ${r.ok} \xB7 \uC2E4\uD328 ${r.errors.length}${r.missing ? ` \xB7 \uACB0\uACFC \uC5C6\uB294 \uC9C0\uC6D0\uAE08 ${r.missing}` : ""}`);
    for (const e of r.errors.slice(0, 20)) console.log(`  - ${e}`);
    if (r.errors.length > 20) console.log(`  - \u2026 \uC678 ${r.errors.length - 20}\uAC74`);
  }
}
if (errors.length || posts.errors.length || reqFails) process.exitCode = 1;
