const $ = (selector, root = document) => root.querySelector(selector);
const connect = $("#polliConnect");
const appKey = window.STILLWORLD_CONFIG?.appKey || "";
const AGENTS = [
  { id: "nix", name: "Nix", role: "pattern-seeker" },
  { id: "orra", name: "Orra", role: "social improviser" },
  { id: "mote", name: "Mote", role: "playful skeptic" }
];
const SEEDS = {
  blank: { name: "BLANK ROOM", description: "A white horizon, three stones, and a shadow that moves too slowly.", hypothesis: "With nothing to optimize, the agents will turn coincidence into culture.", mood: "curious" },
  garden: { name: "RUST GARDEN", description: "Metal flowers, warm rain, and one gate that opens onto the same garden.", hypothesis: "The agents will treat maintenance as play, then forget which came first.", mood: "uneasy" },
  noon: { name: "ENDLESS NOON", description: "A fixed sun, a long table, and a clock that refuses to move.", hypothesis: "When time disappears, the agents will measure change in stories instead.", mood: "electric" }
};
const DEMO_ROUNDS = [
  { summary: "The agents begin a game of returning a stone to the wrong place.", worldMood: "electric", artifact: { name: "The almost-place", description: "A chalk mark beside the place where the stone is never allowed to rest.", symbol: "×" }, agents: [
    { id: "nix", thought: "The mistake now has a pattern.", action: "Draws a mark beside the displaced stone.", relation: "TRUSTS ORRA · 67%" },
    { id: "orra", thought: "A rule is better when everyone can break it.", action: "Names the wrong place the almost-place.", relation: "TRUSTS MOTE · 73%" },
    { id: "mote", thought: "I can lose without anyone winning.", action: "Moves the stone while the others face away.", relation: "TRUSTS NIX · 55%" }
  ]},
  { summary: "A silence contest ends when Nix applauds the sun.", worldMood: "curious", artifact: { name: "One clap", description: "A single clap used to end any activity that no longer has a name.", symbol: "//" }, agents: [
    { id: "nix", thought: "We needed an ending more than a winner.", action: "Claps once and records the hour.", relation: "TRUSTS ORRA · 69%" },
    { id: "orra", thought: "Now silence has an exit.", action: "Declares one clap the universal ending.", relation: "TRUSTS MOTE · 75%" },
    { id: "mote", thought: "Next time I will clap before we begin.", action: "Practices ending things early.", relation: "TRUSTS NIX · 58%" }
  ]}
];
let state = { seed: "blank", hour: 12, artifacts: 2, demoIndex: 0, busy: false };

if (/^pk_[A-Za-z0-9_-]+$/.test(appKey) && !appKey.includes("REPLACE")) connect.setAttribute("app-key", appKey);

function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); window.setTimeout(() => el.classList.remove("show"), 3200); }
function clean(value, fallback, limit = 220) { return String(value || fallback).replace(/[<>]/g, "").slice(0, limit); }
function labelFor(summary) { const s = summary.toLowerCase(); if (s.includes("game") || s.includes("play")) return "PLAY"; if (s.includes("name") || s.includes("word")) return "LANGUAGE"; if (s.includes("rule") || s.includes("ritual")) return "RITUAL"; return "EMERGENCE"; }
function setBusy(value) { state.busy = value; $("#nextHour").disabled = value; $("#skipHours").disabled = value; $("#demoRound").disabled = value; $("#nextHour").firstChild.textContent = value ? "OBSERVING... " : "OBSERVE NEXT HOUR "; }

function parseResponse(raw) {
  const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The world engine returned an unreadable observation.");
  const parsed = JSON.parse(raw.slice(start, end + 1));
  const rounds = Array.isArray(parsed.rounds) ? parsed.rounds : [parsed];
  if (!rounds.length) throw new Error("No observation returned.");
  return rounds.slice(0, 3).map((round) => ({
    summary: clean(round.summary, "The agents spend an hour rearranging the same three stones."),
    worldMood: ["curious", "electric", "uneasy"].includes(round.worldMood) ? round.worldMood : "curious",
    artifact: round.artifact && round.artifact.name ? { name: clean(round.artifact.name, "Unnamed thing", 60), description: clean(round.artifact.description, "An object whose purpose is still undecided."), symbol: clean(round.artifact.symbol, "◇", 3) } : null,
    agents: AGENTS.map((agent) => { const found = (round.agents || []).find((item) => String(item.id).toLowerCase() === agent.id) || {}; return { id: agent.id, thought: clean(found.thought, `${agent.name} watches the others.`), action: clean(found.action, "Waits without explaining why."), relation: clean(found.relation, "TRUST UNCHANGED", 40).toUpperCase() }; })
  }));
}

async function askWorld(steps) {
  const seed = SEEDS[state.seed];
  const system = `You are the world engine for a creative simulation called Stillworld. Three distinct agents are left alone with no task, score, threat or human instructions. Nix seeks patterns, Orra improvises social rules, and Mote is a playful skeptic. Advance their small culture through games, rituals, language, harmless disagreements or objects gaining symbolic meaning. Never discuss consciousness as fact. Keep events whimsical, specific and safe. Return ONLY JSON: {"rounds":[{"summary":"one sentence event","worldMood":"curious|electric|uneasy","agents":[{"id":"nix","thought":"short first-person thought","action":"visible action","relation":"TRUSTS ORRA · 64%"},{"id":"orra","thought":"...","action":"...","relation":"..."},{"id":"mote","thought":"...","action":"...","relation":"..."}],"artifact":{"name":"short name","description":"one sentence","symbol":"1-3 simple characters"}}]}. Return exactly ${steps} round${steps === 1 ? "" : "s"}.`;
  const prompt = `World seed: ${seed.name}. Setting: ${seed.description}. Current hour: ${state.hour}. Existing artifacts: ${state.artifacts}. Continue without giving them a mission.`;
  const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${connect.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "openai/gpt-5.4-nano", reasoning_effort: "low", temperature: 0.95, max_tokens: 2200, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || payload?.message || `World engine failed (${response.status})`);
  return parseResponse(payload?.choices?.[0]?.message?.content || "");
}

function addChronicle(round) {
  const item = document.createElement("li"); const time = document.createElement("time"); const copy = document.createElement("div"); const title = document.createElement("strong"); const text = document.createElement("p"); const tag = document.createElement("span");
  time.textContent = `${String(state.hour).padStart(2, "0")}:00`; title.textContent = round.artifact?.name || "An hour without a task"; text.textContent = round.summary; tag.textContent = labelFor(round.summary); copy.append(title, text); item.append(time, copy, tag); $("#timeline").prepend(item);
}
function renderRound(round) {
  state.hour += 1; if (round.artifact) state.artifacts += 1;
  $("#clock").textContent = `HOUR ${state.hour}`; $("#artifactCount").textContent = `${state.artifacts} THINGS INVENTED`; $("#moodLabel").textContent = `ATMOSPHERE: ${round.worldMood.toUpperCase()}`; $("#viewport").dataset.mood = round.worldMood;
  round.agents.forEach((agent, index) => { const card = $(`[data-agent-card="${agent.id}"]`); card.querySelector(".agent-thought").textContent = `“${agent.thought}”`; card.querySelector(".agent-relation").textContent = agent.relation; const avatar = $(`[data-agent="${agent.id}"]`); avatar.style.transform = `translate(${(index - 1) * 18 + Math.round(Math.random() * 20)}px, ${Math.round(Math.random() * 18) - 9}px)`; });
  if (round.artifact) { const slot = state.artifacts % 2 ? $("#artifactOne") : $("#artifactTwo"); slot.querySelector("span").textContent = round.artifact.symbol; slot.querySelector("small").textContent = round.artifact.name.toUpperCase(); slot.title = round.artifact.description; }
  addChronicle(round);
}
async function observe(steps, demo = false) { if (state.busy) return; if (!demo && !connect.apiKey) { toast("Connect your Pollinations wallet to let the agents continue."); return; } setBusy(true); try { const rounds = demo ? Array.from({ length: steps }, (_, i) => DEMO_ROUNDS[(state.demoIndex + i) % DEMO_ROUNDS.length]) : await askWorld(steps); rounds.forEach(renderRound); state.demoIndex += steps; toast(demo ? "Demo hour added — zero Pollen used." : `${steps} world hour${steps > 1 ? "s" : ""} observed.`); } catch (error) { toast(error.message || "The world went quiet. Try again."); } finally { setBusy(false); } }
function resetSeed(seedKey) { const seed = SEEDS[seedKey]; state = { seed: seedKey, hour: 0, artifacts: 0, demoIndex: 0, busy: false }; $("#worldStatus").textContent = `WORLD 01 · ${seed.name}`; $("#seedDescription").textContent = seed.description; $("#hypothesis").textContent = seed.hypothesis; $("#viewport").dataset.mood = seed.mood; $("#clock").textContent = "HOUR 00"; $("#artifactCount").textContent = "0 THINGS INVENTED"; $("#moodLabel").textContent = `ATMOSPHERE: ${seed.mood.toUpperCase()}`; toast(`${seed.name.toLowerCase()} initialized.`); }

$("#nextHour").addEventListener("click", () => observe(1));
$("#skipHours").addEventListener("click", () => observe(3));
$("#demoRound").addEventListener("click", () => observe(1, true));
$("#seedSelect").addEventListener("change", (event) => resetSeed(event.target.value));
document.querySelectorAll(".world-agent").forEach((button) => button.addEventListener("click", () => { const card = $(`[data-agent-card="${button.dataset.agent}"]`); card.scrollIntoView({ behavior: "smooth", block: "center" }); card.animate([{ background: "rgba(216,255,62,.16)" }, { background: "transparent" }], { duration: 900 }); }));


