import React, { useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Plus, RotateCcw, Undo2, Trophy, Pencil, Trash2, Check, X } from "lucide-react";
import "./styles.css";

const TARGETS = [
  { id: 1, x: 21.5, y: 95, d: 25, score: 14 },
  { id: 2, x: 141.5, y: 95, d: 25, score: 18 },
  { id: 3, x: 80, y: 95, d: 25, score: 16 },
  { id: 4, x: 20, y: 60, d: 22, score: 22 },
  { id: 5, x: 140, y: 60, d: 22, score: 24 },
  { id: 6, x: 42.5, y: 40, d: 22, score: 32 },
  { id: 7, x: 117.5, y: 40, d: 22, score: 34 },
  { id: 8, x: 20, y: 17.5, d: 22, score: 36 },
  { id: 9, x: 55, y: 15, d: 22, score: 26 },
  { id: 10, x: 105, y: 15, d: 22, score: 28 },
  { id: 11, x: 140, y: 17.5, d: 22, score: 38 },
];

const MODES = {
  COUNTDOWN_300: { label: "300 → 0", start: 300, type: "countdown" },
  COUNTDOWN_500: { label: "500 → 0", start: 500, type: "countdown" },
  CLEAR_ALL: { label: "Trefit všechny + bull", start: 0, type: "clear" },
};

function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return String(Date.now() + Math.random());
}

function newPlayer(name, mode) {
  return {
    id: makeId(),
    name,
    score: mode.type === "countdown" ? mode.start : 0,
    hits: {},
    finished: false,
  };
}

function scoreLabel(targetId) {
  if (targetId === "bull") return "BULL";
  const target = TARGETS.find((t) => String(t.id) === String(targetId));
  return target ? `${target.score} bodů` : String(targetId);
}

function safeName(name, fallback = "Nepojmenovaný hráč") {
  const trimmed = String(name || "").trim();
  return trimmed || fallback;
}

function App() {
  const [modeKey, setModeKey] = useState("COUNTDOWN_300");
  const mode = MODES[modeKey];

  const [players, setPlayers] = useState([
    newPlayer("Nepojmenovaný hráč", MODES.COUNTDOWN_300),
  ]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [nameInput, setNameInput] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [history, setHistory] = useState([]);

  const activePlayer = players[activePlayerIndex];
  const allTargetIds = useMemo(() => TARGETS.map((t) => String(t.id)), []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  function resetGame(nextModeKey = modeKey) {
    const nextMode = MODES[nextModeKey];
    setPlayers((prev) => prev.map((p) => newPlayer(p.name, nextMode)));
    setActivePlayerIndex(0);
    setHistory([]);
    setEditingPlayerId(null);
  }

  function changeMode(nextModeKey) {
    setModeKey(nextModeKey);
    resetGame(nextModeKey);
  }

  function addPlayer() {
    const name = safeName(nameInput, `Hráč ${players.length + 1}`);
    setPlayers((prev) => [...prev, newPlayer(name, mode)]);
    setNameInput("");
  }

  function startEditPlayer(player) {
    setEditingPlayerId(player.id);
    setEditingName(player.name);
  }

  function saveEditPlayer() {
    const nextName = safeName(editingName);
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === editingPlayerId ? { ...p, name: nextName } : p
      )
    );
    setHistory((prev) =>
      prev.map((h) =>
        h.playerId === editingPlayerId ? { ...h, playerName: nextName } : h
      )
    );
    setEditingPlayerId(null);
    setEditingName("");
  }

  function cancelEditPlayer() {
    setEditingPlayerId(null);
    setEditingName("");
  }

  function deletePlayer(playerId) {
    if (players.length <= 1) return;

    setPlayers((prev) => {
      const removedIndex = prev.findIndex((p) => p.id === playerId);
      const next = prev.filter((p) => p.id !== playerId);

      setActivePlayerIndex((current) => {
        if (current > removedIndex) return current - 1;
        if (current === removedIndex) return Math.min(current, next.length - 1);
        return current;
      });

      return next;
    });

    setHistory((prev) => prev.filter((h) => h.playerId !== playerId));
  }

  function nextPlayer() {
    setActivePlayerIndex((i) => (i + 1) % players.length);
  }

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

      if (mode.type === "clear") {
        p.hits[String(target.id)] = true;
      }

      return copy;
    });

    setHistory((prev) => [
      {
        before,
        activePlayerIndex,
        target: target === "bull" ? "bull" : target.id,
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        modeKey,
      },
      ...prev,
    ]);
  }

  function undo() {
    const last = history[0];
    if (!last) return;
    setPlayers(last.before);
    setActivePlayerIndex(Math.min(last.activePlayerIndex, last.before.length - 1));
    setHistory((prev) => prev.slice(1));
    setEditingPlayerId(null);
  }

  return (
    <div className="app">
      <div className="shell">
        <div className="header">
          <div>
            <h1 className="title">Florbalové šipky</h1>
            <p className="subtitle">Aktivní hráč: <strong>{activePlayer?.name}</strong></p>
          </div>
          <div className="mode-row">
            <select value={modeKey} onChange={(e) => changeMode(e.target.value)}>
              {Object.entries(MODES).map(([key, m]) => (
                <option key={key} value={key}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="layout">
          <section className="card">
            <div className="card-inner">
              <div className="board-wrap">
                <svg viewBox="0 0 160 110" className="board" aria-label="Florbalový terč">
                  <image href="/board.svg" x="0" y="0" width="160" height="110" preserveAspectRatio="xMidYMid meet" />

                  {TARGETS.map((t) => (
                    <g key={t.id} className="hit-target" onClick={() => applyHit(t)}>
                      <circle cx={t.x} cy={t.y} r={t.d / 2 + 7} fill="transparent" />
                    </g>
                  ))}

                  <g className="hit-target" onClick={() => applyHit("bull")}>
                    <circle cx="80" cy="55" r="25" fill="transparent" />
                  </g>
                </svg>
              </div>

              <div className="controls">
                <button onClick={nextPlayer}>Další hráč</button>
                <button className="secondary" onClick={undo}><Undo2 size={16} /> Undo</button>
                <button className="danger" onClick={() => resetGame()}><RotateCcw size={16} /> Reset</button>
              </div>
            </div>
          </section>

          <aside className="side">
            <section className="card">
              <div className="card-inner">
                <div className="player-form">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                    placeholder="Jméno nového hráče"
                  />
                  <button onClick={addPlayer} aria-label="Přidat hráče"><Plus size={18} /></button>
                </div>

                <div className="players">
                  {players.map((p, idx) => {
                    const hitCount = allTargetIds.filter((id) => p.hits[id]).length;
                    const isEditing = editingPlayerId === p.id;

                    return (
                      <div
                        key={p.id}
                        className={`player ${idx === activePlayerIndex ? "active" : ""}`}
                        onClick={() => !isEditing && setActivePlayerIndex(idx)}
                      >
                        {isEditing ? (
                          <div className="edit-row" onClick={(e) => e.stopPropagation()}>
                            <input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditPlayer();
                                if (e.key === "Escape") cancelEditPlayer();
                              }}
                              autoFocus
                            />
                            <button className="icon ok" onClick={saveEditPlayer} title="Uložit"><Check size={17} /></button>
                            <button className="icon secondary" onClick={cancelEditPlayer} title="Zrušit"><X size={17} /></button>
                          </div>
                        ) : (
                          <>
                            <div className="player-top">
                              <span className="player-name">{p.name}</span>
                              <span className="player-actions">
                                {p.finished && <Trophy size={19} />}
                                <button className="icon ghost" onClick={(e) => { e.stopPropagation(); startEditPlayer(p); }} title="Přejmenovat">
                                  <Pencil size={15} />
                                </button>
                                <button
                                  className="icon danger"
                                  onClick={(e) => { e.stopPropagation(); deletePlayer(p.id); }}
                                  disabled={players.length <= 1}
                                  title={players.length <= 1 ? "Posledního hráče nejde smazat" : "Smazat"}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </span>
                            </div>

                            {mode.type === "countdown" ? (
                              <div className="score">{p.score}</div>
                            ) : (
                              <div>
                                <div className="score">{hitCount}/{TARGETS.length}</div>
                                <div className="muted">{p.finished ? "Hotovo!" : "Po všech terčích zavři BULLem"}</div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="card history-card">
              <div className="card-inner">
                <h2 className="history-title">Historie</h2>
                <div className="history">
                  {history.length === 0 && <div className="muted">Zatím nic.</div>}
                  {history.slice(0, 30).map((h, i) => (
                    <div key={i}>
                      <strong>{h.playerName}</strong>: {scoreLabel(h.target)}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
