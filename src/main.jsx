import React, { useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Plus, RotateCcw, Undo2, Trophy, Pencil, Trash2, Check, X } from "lucide-react";
import "./styles.css";

const BASE_TARGETS = [
  { id: 1, x: 21.5, y: 95, d: 25 },
  { id: 2, x: 141.5, y: 95, d: 25 },
  { id: 3, x: 80, y: 95, d: 25 },
  { id: 4, x: 20, y: 60, d: 22 },
  { id: 5, x: 140, y: 60, d: 22 },
  { id: 6, x: 42.5, y: 40, d: 22 },
  { id: 7, x: 117.5, y: 40, d: 22 },
  { id: 8, x: 20, y: 17.5, d: 22 },
  { id: 9, x: 55, y: 15, d: 22 },
  { id: 10, x: 105, y: 15, d: 22 },
  { id: 11, x: 140, y: 17.5, d: 22 },
];

const BOARD_VARIANTS = {
  "1-12": {
    label: "1–12",
    image: "/boards/board-1-12.svg",
    scores: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 11, 11: 12 },
  },
  "4-24": {
    label: "4–24 sudé",
    image: "/boards/board-4-24.svg",
    scores: { 1: 4, 2: 6, 3: 8, 4: 12, 5: 14, 6: 16, 7: 18, 8: 20, 9: 22, 10: 24, 11: 26 },
  },
  "7-18": {
    label: "7–18",
    image: "/boards/board-7-18.svg",
    scores: { 1: 7, 2: 8, 3: 9, 4: 11, 5: 12, 6: 13, 7: 14, 8: 15, 9: 16, 10: 17, 11: 18 },
  },
  "14-38": {
    label: "14–38 sudé",
    image: "/boards/board-14-38.svg",
    scores: { 1: 14, 2: 18, 3: 16, 4: 22, 5: 24, 6: 32, 7: 34, 8: 36, 9: 26, 10: 28, 11: 38 },
  },
};

const MODES = {
  COUNTDOWN_200: { label: "200 → 0", start: 200, type: "countdown" },
  COUNTDOWN_300: { label: "300 → 0", start: 300, type: "countdown" },
  COUNTDOWN_500: { label: "500 → 0", start: 500, type: "countdown" },
  COUNTDOWN_700: { label: "700 → 0", start: 700, type: "countdown" },
  COUNTDOWN_1000: { label: "1000 → 0", start: 1000, type: "countdown" },
  CLEAR_ALL: { label: "Trefit všechny + bull", start: 0, type: "clear" },
};

const MULTIPLIER_MODES = {
  single: { label: "Single", description: "Každá trefa 100 %" },
  double: { label: "Double", description: "2× stejný terč = 200 %, cap 200 %" },
  triple: { label: "Triple", description: "1×/2×/3× = 100/200/300 %" },
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
    lastTargetId: null,
    streakCount: 0,
  };
}

function safeName(name, fallback = "Nepojmenovaný hráč") {
  const trimmed = String(name || "").trim();
  return trimmed || fallback;
}

function getMultiplier(multiplierMode, streakCount, modeType) {
  if (modeType !== "countdown") return 1;
  if (multiplierMode === "single") return 1;
  if (multiplierMode === "double") return streakCount >= 2 ? 2 : 1;
  if (multiplierMode === "triple") return Math.min(streakCount, 3);
  return 1;
}

function CheckOverlay({ x, y, size = 8 }) {
  return (
    <g className="overlay-check" pointerEvents="none">
      <path
        d={`M ${x - size * 0.62} ${y - size * 0.05} L ${x - size * 0.18} ${y + size * 0.42} L ${x + size * 0.70} ${y - size * 0.55}`}
        fill="none"
        stroke="#22c55e"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`M ${x - size * 0.62} ${y - size * 0.05} L ${x - size * 0.18} ${y + size * 0.42} L ${x + size * 0.70} ${y - size * 0.55}`}
        fill="none"
        stroke="#052e16"
        strokeWidth="0.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </g>
  );
}

function BallOverlay({ x, y, r = 5.2 }) {
  const holes = [
    [0, 0, 1.05],
    [-2.6, -1.7, 0.75],
    [2.5, -1.65, 0.75],
    [-2.35, 2.0, 0.7],
    [2.2, 2.05, 0.7],
    [0, -3.25, 0.6],
  ];

  return (
    <g className="overlay-ball" pointerEvents="none">
      <circle cx={x} cy={y} r={r + 2.1} fill="rgba(14, 165, 233, 0.20)" stroke="#38bdf8" strokeWidth="1.1" />
      <circle cx={x} cy={y} r={r} fill="#e0f2fe" stroke="#0284c7" strokeWidth="0.65" />
      {holes.map(([dx, dy, hr], idx) => (
        <circle key={idx} cx={x + dx} cy={y + dy} r={hr} fill="#0369a1" opacity="0.9" />
      ))}
    </g>
  );
}

const OVERLAY_OFFSETS = {
  // Final-final vertical correction pass.
  1: { dx: 1.5, dy: -2.7 },
  2: { dx: -2.4, dy: -3.2 },
  3: { dx: -0.8, dy: -3.0 },
  4: { dx: 1.1, dy: -2.5 },
  5: { dx: -1.6, dy: -2.5 },
  6: { dx: 0.0, dy: -2.2 },
  7: { dx: -1.3, dy: -2.4 },
  8: { dx: 1.3, dy: -0.4 },
  9: { dx: -0.2, dy: -0.7 },
  10: { dx: -0.6, dy: -0.7 },
  11: { dx: -1.2, dy: -0.2 },
};

const BULL_OVERLAY_OFFSET = {
  dx: 0,
  dy: -1.3,
};

function overlayPos(target) {
  const offset = OVERLAY_OFFSETS[target.id] || { dx: 0, dy: -0.8 };
  return { x: target.x + offset.dx, y: target.y + offset.dy };
}


function DebugOverlay({ target }) {
  const pos = overlayPos(target);
  return (
    <g className="debug-overlay" pointerEvents="none">
      <circle cx={target.x} cy={target.y} r="0.45" fill="#ffffff" opacity="0.95" />
      <line x1={target.x - 4} y1={target.y} x2={target.x + 4} y2={target.y} stroke="#ef4444" strokeWidth="0.22" />
      <line x1={target.x} y1={target.y - 4} x2={target.x} y2={target.y + 4} stroke="#22c55e" strokeWidth="0.22" />
      <circle cx={target.x} cy={target.y} r="1" fill="none" stroke="#facc15" strokeWidth="0.18" strokeDasharray="0.4 0.35" />
      <circle cx={target.x} cy={target.y} r="2" fill="none" stroke="#facc15" strokeWidth="0.18" strokeDasharray="0.4 0.35" />

      <circle cx={pos.x} cy={pos.y} r="2.8" fill="rgba(56, 189, 248, 0.10)" stroke="#38bdf8" strokeWidth="0.28" />
      <line x1={pos.x - 3.8} y1={pos.y} x2={pos.x + 3.8} y2={pos.y} stroke="#38bdf8" strokeWidth="0.32" />
      <line x1={pos.x} y1={pos.y - 3.8} x2={pos.x} y2={pos.y + 3.8} stroke="#38bdf8" strokeWidth="0.32" />
      <circle cx={pos.x} cy={pos.y} r="0.5" fill="#38bdf8" />

      <text x={target.x + 2.6} y={target.y - 2.4} fontSize="2.2" fontWeight="900" fill="#ffffff" stroke="#000000" strokeWidth="0.25" paintOrder="stroke">
        ID {target.id}
      </text>
      <text x={target.x + 2.6} y={target.y + 0.1} fontSize="1.7" fontWeight="800" fill="#facc15" stroke="#000000" strokeWidth="0.2" paintOrder="stroke">
        1 / 2
      </text>
    </g>
  );
}


function App() {
  const [modeKey, setModeKey] = useState("COUNTDOWN_300");
  const [boardVariantKey, setBoardVariantKey] = useState("14-38");
  const [multiplierMode, setMultiplierMode] = useState("single");

  const mode = MODES[modeKey];
  const boardVariant = BOARD_VARIANTS[boardVariantKey];

  const targets = useMemo(() => {
    return BASE_TARGETS.map((target) => ({
      ...target,
      score: boardVariant.scores[target.id],
    }));
  }, [boardVariantKey]);

  const [players, setPlayers] = useState([
    newPlayer("Nepojmenovaný hráč", MODES.COUNTDOWN_300),
  ]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [nameInput, setNameInput] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [history, setHistory] = useState([]);
  const [playMode, setPlayMode] = useState(false);
  const [overlayDebug, setOverlayDebug] = useState(false);

  const activePlayer = players[activePlayerIndex];
  const allTargetIds = useMemo(() => BASE_TARGETS.map((t) => String(t.id)), []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  function scoreLabel(targetId, variantKey = boardVariantKey, multiplier = 1, points = null) {
    if (targetId === "bull") return "BULL / miss";
    const score = BOARD_VARIANTS[variantKey]?.scores?.[Number(targetId)];
    if (!score) return String(targetId);
    if (multiplier > 1) return `${score} ×${multiplier} = ${points}`;
    return `${score} bodů`;
  }

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

  function changeBoardVariant(nextVariantKey) {
    setBoardVariantKey(nextVariantKey);
    setHistory([]);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        lastTargetId: null,
        streakCount: 0,
      }))
    );
  }

  function changeMultiplierMode(nextMultiplierMode) {
    setMultiplierMode(nextMultiplierMode);
    setHistory([]);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        lastTargetId: null,
        streakCount: 0,
      }))
    );
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

  function getClosingInfo(target) {
    if (!activePlayer || mode.type !== "countdown") return null;

    const sameTarget = activePlayer.lastTargetId === target.id;
    const nextStreakCount = sameTarget ? activePlayer.streakCount + 1 : 1;
    const multiplier = getMultiplier(multiplierMode, nextStreakCount, mode.type);
    const points = target.score * multiplier;

    return {
      closes: activePlayer.score === points,
      multiplier,
      points,
    };
  }

  function applyHit(target) {
    if (!activePlayer || activePlayer.finished) return;

    const before = JSON.parse(JSON.stringify(players));
    let eventDetails = {
      multiplier: 1,
      points: 0,
      streakCount: 0,
      busted: false,
    };

    setPlayers((prev) => {
      const copy = prev.map((p) => ({ ...p, hits: { ...p.hits } }));
      const p = copy[activePlayerIndex];

      if (target === "bull") {
        if (mode.type === "clear") {
          const hasAll = allTargetIds.every((id) => p.hits[id]);
          if (hasAll) p.finished = true;
        }

        if (mode.type === "countdown") {
          p.lastTargetId = null;
          p.streakCount = 0;
        }

        eventDetails = { multiplier: 1, points: 0, streakCount: 0, busted: false };
        return copy;
      }

      if (mode.type === "countdown") {
        const sameTarget = p.lastTargetId === target.id;
        const nextStreakCount = sameTarget ? p.streakCount + 1 : 1;
        const multiplier = getMultiplier(multiplierMode, nextStreakCount, mode.type);
        const points = target.score * multiplier;
        const nextScore = p.score - points;

        p.lastTargetId = target.id;
        p.streakCount = nextStreakCount;

        if (nextScore >= 0) {
          p.score = nextScore;
          if (nextScore === 0) p.finished = true;
        } else {
          eventDetails.busted = true;
        }

        eventDetails = { multiplier, points, streakCount: nextStreakCount, busted: nextScore < 0 };
      }

      if (mode.type === "clear") {
        p.hits[String(target.id)] = true;
        eventDetails = { multiplier: 1, points: target.score, streakCount: 0, busted: false };
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
        boardVariantKey,
        multiplierMode,
        ...eventDetails,
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

  const activeMultiplierInfo =
    mode.type === "countdown" && activePlayer?.lastTargetId
      ? `Streak: terč ${activePlayer.lastTargetId}, ${activePlayer.streakCount}×`
      : mode.type === "countdown"
        ? "Streak: žádný"
        : "Streak se u tohoto módu neřeší";

  const clearModeAllHit =
    mode.type === "clear" &&
    activePlayer &&
    allTargetIds.every((id) => activePlayer.hits[id]);

  if (playMode) {
    return (
      <div className="play-mode">
        <div className="play-topbar">
          <div>
            <div className="play-kicker">PLAY MODE!!</div>
            <div className="play-player">{activePlayer?.name}</div>
          </div>
          <div className="play-score">
            {mode.type === "countdown" ? activePlayer?.score : `${allTargetIds.filter((id) => activePlayer?.hits[id]).length}/${BASE_TARGETS.length}`}
          </div>
          <button className="secondary play-exit" onClick={() => setPlayMode(false)}>Exit</button>
        </div>

        <div className="play-board-wrap">
          <svg viewBox="0 0 160 110" className="play-board" aria-label="Florbalový terč">
            <image href={boardVariant.image} x="0" y="0" width="160" height="110" preserveAspectRatio="xMidYMid meet" />

            {overlayDebug && targets.map((t) => <DebugOverlay key={`play-debug-${t.id}`} target={t} />)}

                  {overlayDebug && targets.map((t) => <DebugOverlay key={`debug-${t.id}`} target={t} />)}

            {!overlayDebug && mode.type === "clear" && activePlayer && targets.map((t) => {
              const hit = Boolean(activePlayer.hits[String(t.id)]);
              const pos = overlayPos(t);
              return hit
                ? <CheckOverlay key={`play-check-${t.id}`} x={pos.x} y={pos.y} size={5.0} />
                : <BallOverlay key={`play-ball-${t.id}`} x={pos.x} y={pos.y} r={2.8} />;
            })}

            {!overlayDebug && mode.type === "clear" && clearModeAllHit && (
              <BallOverlay x={80} y={55} r={10.5} />
            )}

            {!overlayDebug && mode.type === "countdown" && activePlayer && targets.map((t) => {
              const closingInfo = getClosingInfo(t);
              const pos = overlayPos(t);
              return closingInfo?.closes
                ? <BallOverlay key={`play-close-${t.id}`} x={pos.x} y={pos.y} r={2.8} />
                : null;
            })}

            {targets.map((t) => (
              <g key={t.id} className="hit-target" onClick={() => applyHit(t)}>
                <circle cx={t.x} cy={t.y} r={t.d / 2 + 7} fill="transparent" />
              </g>
            ))}

            <g className="hit-target" onClick={() => applyHit("bull")}>
              <circle cx="80" cy="55" r="25" fill="transparent" />
            </g>
          </svg>
        </div>

        <div className="play-controls">
          <button onClick={nextPlayer}>Další hráč</button>
          <button className="secondary" onClick={undo}><Undo2 size={16} /> Undo</button>
          <button className="danger" onClick={() => resetGame()}><RotateCcw size={16} /> Reset</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="shell">
        <div className="header">
          <div>
            <h1 className="title">Florbalové šipky</h1>
            <p className="subtitle">Aktivní hráč: <strong>{activePlayer?.name}</strong></p>
          </div>

          <div className="top-selects">
            <label>
              <span>Hra</span>
              <select value={modeKey} onChange={(e) => changeMode(e.target.value)}>
                {Object.entries(MODES).map(([key, m]) => (
                  <option key={key} value={key}>{m.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Terč</span>
              <select value={boardVariantKey} onChange={(e) => changeBoardVariant(e.target.value)}>
                {Object.entries(BOARD_VARIANTS).map(([key, v]) => (
                  <option key={key} value={key}>{v.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Násobení</span>
              <select value={multiplierMode} onChange={(e) => changeMultiplierMode(e.target.value)}>
                {Object.entries(MULTIPLIER_MODES).map(([key, v]) => (
                  <option key={key} value={key}>{v.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Debug</span>
              <button className={overlayDebug ? "debug-toggle active" : "debug-toggle"} onClick={() => setOverlayDebug((v) => !v)}>
                Overlay debug
              </button>
            </label>
          </div>
        </div>

        <div className="layout">
          <section className="card">
            <div className="card-inner">
              <div className="board-wrap">
                <svg viewBox="0 0 160 110" className="board" aria-label="Florbalový terč">
                  <image href={boardVariant.image} x="0" y="0" width="160" height="110" preserveAspectRatio="xMidYMid meet" />

                  {!overlayDebug && mode.type === "clear" && activePlayer && targets.map((t) => {
                    const hit = Boolean(activePlayer.hits[String(t.id)]);
                    const pos = overlayPos(t);
                    return hit
                      ? <CheckOverlay key={`check-${t.id}`} x={pos.x} y={pos.y} size={5.0} />
                      : <BallOverlay key={`ball-${t.id}`} x={pos.x} y={pos.y} r={2.8} />;
                  })}

                  {!overlayDebug && mode.type === "clear" && clearModeAllHit && (
                    <BallOverlay x={80} y={55} r={10.5} />
                  )}

                  {!overlayDebug && mode.type === "countdown" && activePlayer && targets.map((t) => {
                    const closingInfo = getClosingInfo(t);
                    const pos = overlayPos(t);
                    return closingInfo?.closes
                      ? <BallOverlay key={`close-${t.id}`} x={pos.x} y={pos.y} r={2.8} />
                      : null;
                  })}

                  {targets.map((t) => (
                    <g key={t.id} className="hit-target" onClick={() => applyHit(t)}>
                      <circle cx={t.x} cy={t.y} r={t.d / 2 + 7} fill="transparent" />
                    </g>
                  ))}

                  <g className="hit-target" onClick={() => applyHit("bull")}>
                    <circle cx="80" cy="55" r="25" fill="transparent" />
                  </g>
                </svg>
              </div>

              <div className="streak-box">
                <strong>{MULTIPLIER_MODES[multiplierMode].label}</strong>
                <span>{activeMultiplierInfo}</span>
              </div>

              <div className="controls controls-four">
                <button className="play-button" onClick={() => setPlayMode(true)}>PLAY MODE!!</button>
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
                              <>
                                <div className="score">{p.score}</div>
                                <div className="muted">
                                  {p.lastTargetId ? `Streak: terč ${p.lastTargetId}, ${p.streakCount}×` : "Streak: žádný"}
                                </div>
                              </>
                            ) : (
                              <div>
                                <div className="score">{hitCount}/{BASE_TARGETS.length}</div>
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
                      <strong>{h.playerName}</strong>: {scoreLabel(h.target, h.boardVariantKey, h.multiplier, h.points)}
                      {h.busted ? " / bust" : ""}
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
