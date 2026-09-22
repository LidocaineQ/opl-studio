import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual submission handler and range expressions, with an inert
// transport. This checks state transitions, not Desktop interaction or layout.
const source = fs.readFileSync(new URL("../../src/workbench/App.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("App.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nodes = new Map();
function visit(node) {
  if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name) {
    nodes.set(node.name.getText(ast), node);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const compile = (code) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const handler = compile(nodes.get("sendCodexMessage").getText(ast));
const range = ["historyEnd", "historyStart"].map(name => `const ${nodes.get(name).getText(ast)};`).join("\n");

function fixture(overrides = {}) {
  const state = {
    prompt: "new local message", composerSelections: [], resolvedModel: { id: "test" },
    sendState: "idle", codexThreadId: "thread", historyPage: { threadId: "thread", end: 60 },
    messages: Array.from({ length: 100 }, (_, i) => ({ id: `m${i}`, role: "user", text: `old ${i}` })),
    settings: { locale: "en" }, selectedProject: undefined, resolvedReasoning: undefined,
    pendingAssistantIdRef: {}, pendingSubmissionSelectionsRef: {}, ephemeralQueueRef: { current: [] },
    calls: [], ...overrides
  };
  state.messagesRef = { current: state.messages };
  state.setMessages = value => { state.messages = value; };
  state.setHistoryPage = value => { state.historyPage = value; };
  state.setSendState = value => { state.sendState = value; };
  state.bridge = { sendMessage: request => { state.calls.push(request); return new Promise(() => {}); } };
  for (const name of ["setComposerSubmissionError", "updatePrompt", "setComposerSelections", "setSelectedAgent",
    "setPendingInputFiles", "setComposerPaletteOpen", "pickComposerFiles", "replaceEphemeralQueue"]) state[name] = () => {};
  state.selectedAgentSnapshot = () => undefined;
  state.selectedAgentInputs = () => [];
  state.composerSelectionArtifact = value => value;
  state.queuedItemFromComposer = () => ({});
  vm.createContext(state);
  vm.runInContext(handler, state);
  state.visible = () => vm.runInContext(`(() => { ${range} return messages.slice(historyStart, historyEnd); })()`, state);
  return state;
}

test("submitting from older history reveals the new user and pending assistant on the live tail", () => {
  const state = fixture();
  assert.equal(state.visible().at(-1).id, "m59");
  state.sendCodexMessage();
  assert.equal(state.calls.length, 1);
  assert.equal(state.messages.length, 102);
  assert.equal(state.historyPage, null);
  assert.equal(state.visible().length, 40);
  assert.equal(state.visible().at(-2).text, "new local message");
  assert.equal(state.visible().at(-1).id, state.pendingAssistantIdRef.current);
  state.messages.at(-1).text = "streaming reply";
  assert.equal(state.visible().at(-1).text, "streaming reply");
});

test("passive updates preserve the older page", () => {
  const state = fixture();
  state.messages.push({ id: "background", role: "assistant", text: "background update" });
  assert.equal(state.visible().at(-1).id, "m59");
  assert.equal(state.historyPage.end, 60);
});

test("empty, command, unready attachment and queued input do not reset the older page", () => {
  for (const input of [{ prompt: "" }, { prompt: "/open" }, { resolvedModel: undefined },
    { composerSelections: [{ attachment: { status: "pending" } }] }, { sendState: "running" }]) {
    const state = fixture(input);
    state.sendCodexMessage();
    assert.equal(state.calls.length, 0);
    assert.equal(state.historyPage.end, 60);
    assert.equal(state.visible().at(-1).id, "m59");
  }
});
