import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const js = await readFile(new URL("../dist/app.js", import.meta.url), "utf8");

test("uses capped Bring Your Own Pollen for Quest 19177", () => {
  assert.match(html, /<polli-connect/);
  assert.match(html, /budget="2\.5"/);
  assert.match(html, /Quest #19177/);
});

test("runs the world through a Pollinations model", () => {
  assert.match(js, /gen\.pollinations\.ai\/v1\/chat\/completions/);
  assert.match(js, /openai\/gpt-5\.4-nano/);
  assert.match(js, /Nix seeks patterns/);
});

test("includes a zero-Pollen local demo and clear disclaimer", () => {
  assert.match(js, /DEMO_ROUNDS/);
  assert.match(html, /zero-Pollen demo round/);
  assert.match(html, /not a scientific experiment/);
});