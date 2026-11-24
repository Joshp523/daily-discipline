// dd-remind: the nagging. Deploy as a Supabase Edge Function named dd-remind, with "Verify JWT" OFF.
// Secrets: VAPID_SUBJECT (mailto:you@example.com), VAPID_PUBLIC, VAPID_PRIVATE (from make-vapid-keys.html).
//
// Called three ways:
//   {key:1}          the app asks for the public key so it can register this phone
//   {test:endpoint}  "Send a test" in Settings
//   {tick:1}         pg_cron, every hour on the hour. For each registered phone, if it's one of the hours that
//                    phone picked (in its own time zone), and today isn't fully kept, send a nag. Each phone gets
//                    at most one per hour (last_slot), so calling this extra times can't spam anyone.
// Today's status comes from the accountability board (dd_public, id "josh"), which the app updates on every sync.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (o: unknown) => new Response(JSON.stringify(o), { headers: { ...CORS, "Content-Type": "application/json" } });
type Sub = { endpoint: string; sub: webpush.PushSubscription; tz: string; hours: number[]; last_slot: string | null };

const NAME: Record<string, string> = { r: "Rise", b: "Body", m: "Money", s: "Spirit" };
const list = (a: string[]) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a.at(-1);
const pick = <T,>(a: T[], seed: number) => a[seed % a.length];

// local date (YYYY-MM-DD) and hour for a time zone
function local(tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: +p.hour % 24 };
}

// The nag. lvl = how many reminders already went out today (0 = first), last = this is the final one tonight.
function nag(e: { p?: string; c?: number } | undefined, streak: number, lvl: number, last: boolean, seed: number) {
  const kept = e?.p ?? "", open = ["r", "b", "m", "s"].filter((k) => !kept.includes(k)).map((k) => NAME[k]);
  const st = streak > 1 ? `${streak}-day streak` : "streak";
  if (!e) return {
    title: pick(["Nothing logged today", "Hello? Anyone home?", "Today is a blank page"], seed),
    body: lvl === 0 ? "You haven’t opened Daily Discipline today. Not once. Two minutes, go."
      : last ? `Last call. Nothing logged all day, and your ${st} is on the line. Open the app.`
      : pick(["Still nothing logged. The app is lonely and so is your discipline.", "Zero entries today. A ghost would have logged more.", "You’ve ignored this before. Ignore it again and it gets ruder."], seed),
    badge: 4 };
  const n = open.length, what = list(open);
  const tone = last ? [`Last call: ${what} still open. Your ${st} is on the line.`, `Final warning. ${what}. Now, before bed.`]
    : lvl === 0 ? [`Still open today: ${what}. Knock ${n > 1 ? "them" : "it"} out.`, `${what} ${n > 1 ? "are" : "is"} waiting. Small wins, early.`]
    : lvl === 1 ? [`${what}, still open. You said you’d be disciplined. Daily, even.`, `Reminder #2: ${what}. The app remembers even if you don’t.`]
    : [`${what}. Still. Future you is shaking his head.`, `This is reminder #${lvl + 1}. ${what}. I can do this all night.`, `${what} still open. The couch is not a training plan.`];
  return { title: n === 1 && (e.c ?? 0) >= 3 ? "One away from a perfect day" : last ? "Last call" : "Daily Discipline", body: pick(tone, seed), badge: n };
}

const send = (s: Sub, m: { title: string; body: string; badge: number }, tag: string) =>
  webpush.sendNotification(s.sub, JSON.stringify({ ...m, url: "./", tag }), { TTL: 3600, urgency: "high" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const body = await req.json().catch(() => ({}));
  if (body.key) return json({ key: Deno.env.get("VAPID_PUBLIC") });

  if (body.test) {
    const { data: s } = await db.from("dd_push_subs").select("*").eq("endpoint", body.test).maybeSingle();
    if (!s) return json({ ok: false, why: "this phone isn’t registered — turn reminders off and on" });
    try { await send(s, { title: "Daily Discipline", body: "Test: reminders reach this phone. Now go log something.", badge: 0 }, "dd-test"); return json({ ok: true }); }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await db.from("dd_push_subs").delete().eq("endpoint", s.endpoint); return json({ ok: false, why: String(e.body ?? e.message ?? e).slice(0, 160) }); }
  }

  // hourly tick
  const [{ data: subs }, { data: board }] = await Promise.all([
    db.from("dd_push_subs").select("*"),
    db.from("dd_public").select("data").eq("id", "josh").maybeSingle(),
  ]);
  const days = board?.data?.days ?? {}, streak = board?.data?.chain ?? 0;
  let sent = 0;
  for (const s of (subs ?? []) as Sub[]) {
    const { day, hour } = local(s.tz), hrs = [...(s.hours ?? [])].sort((a, b) => a - b), slot = `${day}:${hour}`;
    if (!hrs.includes(hour) || s.last_slot === slot) continue;
    const e = days[day];
    if (e && (e.p ?? "").length >= 4) continue;              // all four kept: peace and quiet
    const lvl = hrs.indexOf(hour), last = lvl === hrs.length - 1;
    const m = nag(e, streak, lvl, last, lvl + new Date(day).getDate());
    await db.from("dd_push_subs").update({ last_slot: slot }).eq("endpoint", s.endpoint);
    try { await send(s, m, `dd-${slot}`); sent++; }
    catch (err) { if (err.statusCode === 404 || err.statusCode === 410) await db.from("dd_push_subs").delete().eq("endpoint", s.endpoint); }
  }
  return json({ ok: true, sent });
});
