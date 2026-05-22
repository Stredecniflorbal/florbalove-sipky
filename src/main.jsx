import React, { useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Plus, RotateCcw, Undo2, Trophy } from "lucide-react";
import "./styles.css";

const TARGETS = [
  { id: 1, x: 21.5, y: 95, d: 25, score: 14, color: "#f97316" },
  { id: 2, x: 141.5, y: 95, d: 25, score: 18, color: "#eab308" },
  { id: 3, x: 80, y: 95, d: 25, score: 16, color: "#22c55e" },
  { id: 4, x: 20, y: 60, d: 22, score: 22, color: "#ec4899" },
  { id: 5, x: 140, y: 60, d: 22, score: 24, color: "#06b6d4" },
  { id: 6, x: 42.5, y: 40, d: 22, score: 32, color: "#a855f7" },
  { id: 7, x: 117.5, y: 40, d: 22, score: 34, color: "#3b82f6" },
  { id: 8, x: 20, y: 17.5, d: 22, score: 36, color: "#ef4444" },
  { id: 9, x: 55, y: 15, d: 22, score: 26, color: "#84cc16" },
  { id: 10, x: 105, y: 15, d: 22, score: 28, color: "#14b8a6" },
  { id: 11, x: 140, y: 17.5, d: 22, score: 38, color: "#f43f5e" },
];

const MODES = {
  COUNTDOWN_300: { label: "300 → 0", start: 300, type: "countdown" },
  COUNTDOWN_500: { label: "500 → 0", start: 500, type: "countdown" },
  CLEAR_ALL: { label: "Trefit všechny + bull", start: 0, type: "clear" },
};

function makeId() { return crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
function newPlayer(name, mode) { return { id: makeId(), name, score: mode.type === "countdown" ? mode.start : 0, hits: {}, finished: false }; }
function scoreLabel(targetId) {
  if (targetId === "bull") return "BULL";
  const target = TARGETS.find((t) => String(t.id) === String(targetId));
  return target ? `${target.score} bodů` : String(targetId);
}

function App() {
  const [modeKey, setModeKey] = useState("COUNTDOWN_300");
  const mode = MODES[modeKey];
  const [players, setPlayers] = useState([newPlayer("Koště", MODES.COUNTDOWN_300), newPlayer("Hráč 2", MODES.COUNTDOWN_300)]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [nameInput, setNameInput] = useState("");
  const [history, setHistory] = useState([]);
  const activePlayer = players[activePlayerIndex];
  const allTargetIds = useMemo(() => TARGETS.map((t) => String(t.id)), []);

  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []);

  function resetGame(nextModeKey = modeKey) {
    const nextMode = MODES[nextModeKey];
    setPlayers((prev) => prev.map((p) => newPlayer(p.name, nextMode)));
    setActivePlayerIndex(0);
    setHistory([]);
  }
  function changeMode(nextModeKey) { setModeKey(nextModeKey); resetGame(nextModeKey); }
  function addPlayer() { const name = nameInput.trim(); if (!name) return; setPlayers((prev) => [...prev, newPlayer(name, mode)]); setNameInput(""); }
  function nextPlayer() { setActivePlayerIndex((i) => (i + 1) % players.length); }

  function applyHit(target) {
    if (!activePlayer || activePlayer.finished) return;
    const before = JSON.parse(JSON.stringify(players));
    setPlayers((prev) => {
      const copy = prev.map((p) => ({ ...p, hits: { ...p.hits } }));
      const p = copy[activePlayerIndex];
      if (target === "bull") {
        if (mode.type === "clear") {
          const hasAll = allTargetIds.every((id) => p.hits[id]);
          if (hasAll) p.finished = true;
        }
        return copy;
      }
      if (mode.type === "countdown") {
        const nextScore = p.score - target.score;
        if (nextScore >= 0) p.score = nextScore;
        if (nextScore === 0) p.finished = true;
      }
      if (mode.type === "clear") p.hits[String(target.id)] = true;
      return copy;
    });
    setHistory((prev) => [{ before, activePlayerIndex, target: target === "bull" ? "bull" : target.id, playerName: activePlayer.name, modeKey }, ...prev]);
  }
  function undo() { const last = history[0]; if (!last) return; setPlayers(last.before); setActivePlayerIndex(last.activePlayerIndex); setHistory((prev) => prev.slice(1)); }

  return (
    <div className="app"><div className="shell">
      <div className="header"><div><h1 className="title">Florbalové šipky</h1><p className="subtitle">Aktivní hráč: <strong>{activePlayer?.name}</strong></p></div><div className="mode-row"><select value={modeKey} onChange={(e) => changeMode(e.target.value)}>{Object.entries(MODES).map(([key, m]) => <option key={key} value={key}>{m.label}</option>)}</select></div></div>
      <div className="layout">
        <section className="card"><div className="card-inner"><div className="board-wrap"><svg viewBox="0 0 160 110" className="board" aria-label="Florbalový terč"><rect x="0" y="0" width="160" height="110" rx="3" fill="#ffffff" />{TARGETS.map((t) => <g key={t.id} className="hit-target" onClick={() => applyHit(t)}><circle cx={t.x} cy={t.y} r={t.d / 2 + 6} fill="transparent" /><circle className="target-circle" cx={t.x} cy={t.y} r={t.d / 2} fill={t.color} stroke="#111827" strokeWidth="0.7" /><text x={t.x} y={t.y + 0.3} textAnchor="middle" dominantBaseline="middle" fontSize="7" fontWeight="900" fill="#111827">{t.score}</text></g>)}<g className="hit-target" onClick={() => applyHit("bull")}><circle cx="80" cy="55" r="25" fill="transparent" /><circle className="target-circle" cx="80" cy="55" r="20" fill="#f8fafc" stroke="#111827" strokeWidth="0.9" /><circle cx="80" cy="55" r="9" fill="#38bdf8" opacity="0.9" /><text x="80" y="55.5" textAnchor="middle" dominantBaseline="middle" fontSize="7" fontWeight="900" fill="#111827">BULL</text></g></svg></div><div className="controls"><button onClick={nextPlayer}>Další hráč</button><button className="secondary" onClick={undo}><Undo2 size={16} /> Undo</button><button className="danger" onClick={() => resetGame()}><RotateCcw size={16} /> Reset</button></div></div></section>
        <aside><section className="card"><div className="card-inner"><div className="player-form"><input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} placeholder="Jméno hráče" /><button onClick={addPlayer} aria-label="Přidat hráče"><Plus size={18} /></button></div><div className="players">{players.map((p, idx) => { const hitCount = allTargetIds.filter((id) => p.hits[id]).length; return <button key={p.id} className={`player ${idx === activePlayerIndex ? "active" : ""}`} onClick={() => setActivePlayerIndex(idx)}><div className="player-top"><span className="player-name">{p.name}</span>{p.finished && <Trophy size={20} />}</div>{mode.type === "countdown" ? <div className="score">{p.score}</div> : <div><div className="score">{hitCount}/{TARGETS.length}</div><div className="muted">{p.finished ? "Hotovo!" : "Po všech terčích zavři BULLem"}</div></div>}</button>; })}</div></div></section><section className="card" style={{marginTop:14}}><div className="card-inner"><h2 style={{margin:"0 0 10px",fontSize:18}}>Historie</h2><div className="history">{history.length === 0 && <div className="muted">Zatím nic.</div>}{history.slice(0, 30).map((h, i) => <div key={i}><strong>{h.playerName}</strong>: {scoreLabel(h.target)}</div>)}</div></div></section></aside>
      </div>
    </div></div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
