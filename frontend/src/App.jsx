import { useState, useRef, useEffect } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:7860").replace(/\/$/, "");

const FEATURES = [
  { key: "n_fp_laps", label: "Total FP Laps", min: 0, max: 100, step: 1, default: 40, unit: "laps", hint: "Total laps across all free practice sessions" },
  { key: "n_fp_sessions_participated", label: "FP Sessions", min: 0, max: 3, step: 1, default: 3, unit: "sessions", hint: "Number of FP sessions the driver participated in" },
  { key: "best_fp_lap_time_overall", label: "Best FP Lap Time", min: 60, max: 120, step: 0.001, default: 88.5, unit: "s", hint: "Fastest lap time across all FP sessions" },
  { key: "avg_fp_lap_time", label: "Avg FP Lap Time", min: 60, max: 140, step: 0.001, default: 92.0, unit: "s", hint: "Average lap time across all FP sessions" },
  { key: "median_fp_lap_time", label: "Median FP Lap Time", min: 60, max: 140, step: 0.001, default: 91.5, unit: "s", hint: "Median lap time across all FP sessions" },
  { key: "best_last_fp_lap_time", label: "Best Lap (Last FP)", min: 60, max: 120, step: 0.001, default: 88.8, unit: "s", hint: "Best lap time in the most recent FP session" },
  { key: "best_last_fp_s1", label: "Best S1 (Last FP)", min: 15, max: 50, step: 0.001, default: 28.2, unit: "s", hint: "Best Sector 1 time in last FP" },
  { key: "best_last_fp_s2", label: "Best S2 (Last FP)", min: 15, max: 60, step: 0.001, default: 32.1, unit: "s", hint: "Best Sector 2 time in last FP" },
  { key: "best_last_fp_s3", label: "Best S3 (Last FP)", min: 10, max: 50, step: 0.001, default: 28.5, unit: "s", hint: "Best Sector 3 time in last FP" },
];

const initialValues = Object.fromEntries(FEATURES.map((f) => [f.key, f.default]));

const positionColor = (pos) => {
  if (pos === 1) return "#FFD700";
  if (pos <= 3) return "#e8e8e8";
  if (pos <= 10) return "#4ade80";
  if (pos <= 15) return "#facc15";
  return "#f87171";
};

const positionLabel = (pos) => {
  if (pos === 1) return "POLE POSITION";
  if (pos <= 3) return "FRONT ROW";
  if (pos <= 5) return "TOP 5";
  if (pos <= 10) return "POINTS FINISH";
  if (pos <= 15) return "MIDFIELD";
  return "BACK OF GRID";
};

function F1Car({ color = "#e10600", scale = 1 }) {
  return (
    <svg width={120 * scale} height={36 * scale} viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="3" height="16" fill={color} rx="1"/>
      <rect x="0" y="3" width="7" height="3" fill={color} rx="1"/>
      <path d="M5 14 Q10 8 30 8 L85 8 Q100 8 108 14 Q112 17 110 22 L85 26 Q60 28 35 26 L8 22 Q4 19 5 14Z" fill={color}/>
      <path d="M45 8 Q52 2 68 2 Q76 2 80 8Z" fill="#1a1a2e"/>
      <path d="M47 8 Q53 4 68 4 Q74 4 78 8Z" fill="#2a2a4e" opacity="0.6"/>
      <path d="M108 20 L118 18 L120 22 L110 24Z" fill={color}/>
      <rect x="114" y="17" width="6" height="2" fill={color} rx="1"/>
      <circle cx="20" cy="27" r="7" fill="#111" stroke="#333" strokeWidth="2"/>
      <circle cx="20" cy="27" r="3" fill="#222"/>
      <circle cx="95" cy="27" r="7" fill="#111" stroke="#333" strokeWidth="2"/>
      <circle cx="95" cy="27" r="3" fill="#222"/>
      <line x1="0" y1="11" x2="-20" y2="11" stroke={color} strokeWidth="2" opacity="0.5"/>
      <line x1="0" y1="15" x2="-35" y2="15" stroke={color} strokeWidth="1.5" opacity="0.35"/>
      <line x1="0" y1="19" x2="-14" y2="19" stroke={color} strokeWidth="1" opacity="0.2"/>
    </svg>
  );
}

const RACE_CARS = [
  { color: "#e10600", delay: 0,    duration: 1.0, top: "18%", scale: 1.2 },
  { color: "#00d2be", delay: 0.18, duration: 1.25, top: "33%", scale: 1.0 },
  { color: "#0067ff", delay: 0.06, duration: 0.95, top: "50%", scale: 1.1 },
  { color: "#ff8700", delay: 0.28, duration: 1.35, top: "65%", scale: 0.95 },
  { color: "#ffffff", delay: 0.12, duration: 1.15, top: "78%", scale: 0.9 },
];

function RaceOverlay({ active, onDone }) {
  useEffect(() => {
    if (active) {
      const t = setTimeout(onDone, 2000);
      return () => clearTimeout(t);
    }
  }, [active, onDone]);

  if (!active) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Dark backdrop */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(4,4,10,0.93)",
        backdropFilter: "blur(3px)",
      }} />

      {/* Track lane lines */}
      {RACE_CARS.map((car, i) => (
        <div key={i} style={{
          position: "absolute", left: 0, right: 0,
          top: car.top, height: "1px",
          background: "rgba(255,255,255,0.05)",
        }} />
      ))}

      {/* Racing cars */}
      {RACE_CARS.map((car, i) => (
        <div key={i} style={{
          position: "absolute",
          top: car.top,
          left: 0,
          transform: "translateY(-50%)",
          animation: `raceCar ${car.duration}s linear ${car.delay}s both`,
          zIndex: 2,
        }}>
          <F1Car color={car.color} scale={car.scale} />
        </div>
      ))}

      {/* Speed streaks */}
      {Array.from({ length: 25 }, (_, i) => (
        <div key={i} style={{
          position: "absolute",
          top: `${Math.random() * 100}%`,
          left: 0,
          width: `${Math.random() * 180 + 60}px`,
          height: "1px",
          background: `linear-gradient(90deg, transparent, rgba(225,6,0,${Math.random() * 0.3 + 0.1}), transparent)`,
          animation: `speedLine ${Math.random() * 0.5 + 0.3}s linear ${Math.random() * 1.8}s both`,
          zIndex: 1,
        }} />
      ))}

      {/* Centre label */}
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", pointerEvents: "none" }}>
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 26, fontWeight: 900, color: "#fff",
          letterSpacing: "10px",
          textShadow: "0 0 40px rgba(225,6,0,0.9), 0 0 80px rgba(225,6,0,0.4)",
          marginBottom: 16,
          animation: "flicker 0.08s ease infinite",
        }}>
          CALCULATING
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {[0, 0.25, 0.5].map((d, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%", background: "#e10600",
              animation: `dotPop 0.75s ease ${d}s infinite`,
              boxShadow: "0 0 10px #e10600",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [values, setValues] = useState(initialValues);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [racing, setRacing] = useState(false);
  const [error, setError] = useState(null);
  const resultRef = useRef(null);
  const pendingResult = useRef(null);

  const handleChange = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: parseFloat(val) }));
  };

  const handlePredict = async () => {
    setLoading(true);
    setRacing(true);
    setError(null);
    setResult(null);
    pendingResult.current = null;

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      // 429 = too fast (anti-spam); 503 = demo paused via the kill switch.
      // Handle both distinctly, reading the message from the {detail:{message}} body.
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail?.message ?? "You're going too fast — please slow down and try again.");
      }
      if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail?.message ?? "This demo is temporarily paused. Check back soon.");
      }
      if (!res.ok) {
        let message = "Prediction failed";
        try {
          const err = await res.json();
          // detail may be a string or, from the rate-limit engine, an object.
          message = (typeof err.detail === "string" ? err.detail : err.detail?.message) || message;
        } catch {
          const text = await res.text();
          if (text) message = text;
        }

        throw new Error(message);
      }
      const data = await res.json();
      pendingResult.current = { data };
    } catch (e) {
      pendingResult.current = { error: e.message };
    } finally {
      setLoading(false);
    }
  };

  const handleRaceDone = () => {
    setRacing(false);
    if (pendingResult.current) {
      if (pendingResult.current.error) {
        setError(pendingResult.current.error);
      } else {
        setResult(pendingResult.current.data);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
      }
      pendingResult.current = null;
    }
  };

  const handleReset = () => {
    setValues(initialValues);
    setResult(null);
    setError(null);
  };

  return (
    <div style={styles.root}>
      <RaceOverlay active={racing} onDone={handleRaceDone} />

      <div style={styles.bgGrid} />
      <div style={styles.vignette} />
      <div style={styles.glowOrb} />

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.flagStripe} />
          <div style={styles.logoRow}>
            <div style={styles.logoBlock}>
              <span style={styles.logoF1}>F1</span>
              <div style={styles.logoLines}>
                <div style={styles.logoline1} />
                <div style={styles.logoline2} />
              </div>
            </div>
            <div style={styles.titleBlock}>
              <span style={styles.logoText}>QUALIFYING</span>
              <span style={styles.logoTextSub}>PREDICTOR</span>
            </div>
            <div style={styles.headerBadge}>
              <span style={styles.badgeDot} />
              LIVE MODEL
            </div>
          </div>
          <p style={styles.subheader}>
            XGBoost · Optuna Tuned · 2018–2024 Training · 2025 Test · ~5 Grid Positions MAE
          </p>
        </div>
        <div style={styles.headerLine} />
        <div style={styles.headerLineFade} />
      </header>

      <main style={styles.main}>
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTagRow}>
              <span style={styles.cardTag}>FREE PRACTICE DATA</span>
              <span style={styles.cardTagRight}>9 FEATURES</span>
            </div>
            <h2 style={styles.cardTitle}>Driver Input</h2>
            <div style={styles.cardTitleLine} />
          </div>

          <div style={styles.grid}>
            {FEATURES.map((f, i) => (
              <div key={f.key} style={{ ...styles.inputGroup, animationDelay: `${i * 0.05}s` }}>
                <div style={styles.inputLabelRow}>
                  <label style={styles.inputLabel}>{f.label}</label>
                  <span style={styles.inputValue}>
                    {f.step < 1 ? values[f.key].toFixed(3) : values[f.key]}
                    <span style={styles.inputUnit}> {f.unit}</span>
                  </span>
                </div>
                <div style={styles.sliderWrapper}>
                  <div style={{
                    ...styles.sliderFill,
                    width: `${((values[f.key] - f.min) / (f.max - f.min)) * 100}%`
                  }} />
                  <input
                    type="range" min={f.min} max={f.max} step={f.step}
                    value={values[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    style={styles.slider}
                  />
                </div>
                <div style={styles.sliderMinMax}>
                  <span>{f.min}{f.unit}</span>
                  <span style={styles.inputHint}>{f.hint}</span>
                  <span>{f.max}{f.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.buttonRow}>
            <button onClick={handleReset} style={styles.resetBtn}>↺ RESET</button>
            <button
              onClick={handlePredict}
              disabled={loading || racing}
              style={{ ...styles.predictBtn, opacity: (loading || racing) ? 0.6 : 1 }}
            >
              <span style={styles.predictBtnInner}>
                <span>⚑</span>
                {racing ? "RACING..." : "PREDICT POSITION"}
              </span>
            </button>
          </div>

          {error && (
            <div style={styles.errorBox}>⚠ {error}</div>
          )}
        </section>

        {result && (
          <section ref={resultRef} style={styles.resultCard}>
            <div style={styles.chequeredStrip}>
              {Array.from({ length: 40 }, (_, i) => (
                <div key={i} style={{ ...styles.chequeredCell, background: i % 2 === 0 ? "#fff" : "#000" }} />
              ))}
            </div>
            <div style={styles.resultBody}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTagRow}>
                  <span style={{ ...styles.cardTag, color: positionColor(result.rounded_position) }}>
                    QUALIFYING RESULT
                  </span>
                </div>
                <h2 style={styles.cardTitle}>Predicted Grid Position</h2>
                <div style={{ ...styles.cardTitleLine, background: positionColor(result.rounded_position) }} />
              </div>

              <div style={styles.resultInner}>
                <div style={styles.positionDisplay}>
                  <span style={styles.pLabel}>P</span>
                  <span style={{
                    ...styles.pNumber,
                    color: positionColor(result.rounded_position),
                    textShadow: `0 0 60px ${positionColor(result.rounded_position)}66`,
                  }}>
                    {result.rounded_position}
                  </span>
                </div>
                <div style={styles.resultMeta}>
                  <div style={{
                    ...styles.positionBadge,
                    color: positionColor(result.rounded_position),
                    borderColor: positionColor(result.rounded_position),
                    boxShadow: `0 0 20px ${positionColor(result.rounded_position)}33`,
                  }}>
                    {positionLabel(result.rounded_position)}
                  </div>
                  <div style={styles.metaStats}>
                    {[
                      { label: "RAW PREDICTION", val: result.predicted_position },
                      { label: "MODEL MAE", val: "~5.0" },
                      { label: "ALGORITHM", val: "XGBoost" },
                    ].map((s) => (
                      <div key={s.label} style={styles.metaStat}>
                        <span style={styles.metaStatLabel}>{s.label}</span>
                        <span style={styles.metaStatVal}>{s.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={styles.gridViz}>
                <p style={styles.gridVizTitle}>STARTING GRID — ALL 20 POSITIONS</p>
                <div style={styles.gridTrack}>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((pos) => {
                    const isTarget = pos === result.rounded_position;
                    return (
                      <div key={pos} style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        {isTarget && (
                          <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 4 }}>
                            <F1Car color={positionColor(result.rounded_position)} scale={0.3} />
                          </div>
                        )}
                        <div style={{
                          ...styles.gridSlot,
                          background: isTarget ? positionColor(result.rounded_position) : "rgba(255,255,255,0.06)",
                          transform: isTarget ? "scaleY(1.6)" : "scaleY(1)",
                          boxShadow: isTarget ? `0 0 12px ${positionColor(result.rounded_position)}88` : "none",
                        }} />
                      </div>
                    );
                  })}
                </div>
                <div style={styles.gridLabels}>
                  <span>POLE</span><span>P10</span><span>P20</span>
                </div>
              </div>
            </div>
          </section>
        )}

        <section style={styles.infoCard}>
          <div style={styles.infoGrid}>
            {[
              { label: "MODEL", val: "XGBoost" },
              { label: "TUNING", val: "Optuna" },
              { label: "TRAIN", val: "2018–2023" },
              { label: "EVAL", val: "2024" },
              { label: "TEST", val: "2025" },
              { label: "FEATURES", val: "9 FP" },
              { label: "MAE", val: "~5 pos" },
            ].map((item) => (
              <div key={item.label} style={styles.infoItem}>
                <span style={styles.infoLabel}>{item.label}</span>
                <span style={styles.infoVal}>{item.val}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&family=Rajdhani:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080810; overflow-x: hidden; }

        @keyframes raceCar {
          0%   { transform: translateX(-220px) translateY(-50%); }
          100% { transform: translateX(calc(100vw + 220px)) translateY(-50%); }
        }
        @keyframes speedLine {
          0%   { transform: translateX(-300px); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateX(calc(100vw + 300px)); opacity: 0; }
        }
        @keyframes flicker {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.93; }
        }
        @keyframes dotPop {
          0%,100% { transform: scale(0.5); opacity: 0.4; }
          50%      { transform: scale(1.2); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes resultReveal {
          from { opacity: 0; transform: translateY(40px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes orbPulse {
          0%,100% { opacity: 0.4; }
          50%      { opacity: 0.7; }
        }
        @keyframes badgePulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }

        input[type=range] {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 4px;
          background: transparent; outline: none;
          position: absolute; top: 0; left: 0; z-index: 2; cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: #e10600; border: 2px solid #fff;
          cursor: pointer; box-shadow: 0 0 10px #e1060099;
        }
        input[type=range]::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: #e10600; border: 2px solid #fff; cursor: pointer;
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#080810", color: "#f0f0f0", fontFamily: "'Rajdhani', sans-serif", position: "relative", overflowX: "hidden" },
  bgGrid: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `linear-gradient(rgba(225,6,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(225,6,0,0.03) 1px, transparent 1px)`, backgroundSize: "40px 40px" },
  vignette: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.75) 100%)" },
  glowOrb: { position: "fixed", top: -200, left: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(225,6,0,0.12) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, animation: "orbPulse 4s ease-in-out infinite" },
  header: { position: "relative", zIndex: 3, padding: "40px 48px 0", background: "linear-gradient(180deg, rgba(225,6,0,0.05) 0%, transparent 100%)" },
  headerInner: { maxWidth: 960, margin: "0 auto" },
  flagStripe: { width: 60, height: 4, marginBottom: 20, background: "repeating-linear-gradient(90deg, #fff 0px, #fff 8px, #000 8px, #000 16px)", borderRadius: 2 },
  logoRow: { display: "flex", alignItems: "center", gap: 20, marginBottom: 12 },
  logoBlock: { display: "flex", alignItems: "center", gap: 8, background: "#e10600", padding: "8px 16px", borderRadius: 2, boxShadow: "0 0 30px rgba(225,6,0,0.5)" },
  logoF1: { fontFamily: "'Orbitron', sans-serif", fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "2px" },
  logoLines: { display: "flex", flexDirection: "column", gap: 4 },
  logoline1: { width: 24, height: 2, background: "#fff", borderRadius: 1 },
  logoline2: { width: 16, height: 2, background: "rgba(255,255,255,0.5)", borderRadius: 1 },
  titleBlock: { display: "flex", flexDirection: "column" },
  logoText: { fontFamily: "'Orbitron', sans-serif", fontSize: 22, fontWeight: 700, color: "#f0f0f0", letterSpacing: "6px", lineHeight: 1 },
  logoTextSub: { fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 400, color: "#888", letterSpacing: "8px" },
  headerBadge: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", border: "1px solid rgba(225,6,0,0.4)", borderRadius: 2, fontSize: 11, fontFamily: "'Share Tech Mono', monospace", color: "#e10600", letterSpacing: "2px", background: "rgba(225,6,0,0.08)" },
  badgeDot: { display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#e10600", animation: "badgePulse 1.5s ease-in-out infinite", boxShadow: "0 0 8px #e10600" },
  subheader: { fontSize: 11, color: "#666", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 28, fontFamily: "'Share Tech Mono', monospace" },
  headerLine: { maxWidth: 960, margin: "0 auto", height: 2, background: "linear-gradient(90deg, #e10600 0%, #e10600aa 40%, transparent 100%)" },
  headerLineFade: { maxWidth: 960, margin: "0 auto", height: 20, background: "linear-gradient(180deg, rgba(225,6,0,0.08), transparent)" },
  main: { position: "relative", zIndex: 3, maxWidth: 960, margin: "0 auto", padding: "32px 48px 80px", display: "flex", flexDirection: "column", gap: 20 },
  card: { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 3, padding: "36px 40px", animation: "fadeUp 0.5s ease both", backdropFilter: "blur(4px)" },
  cardHeader: { marginBottom: 28 },
  cardTagRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTag: { fontSize: 10, letterSpacing: "3px", color: "#e10600", fontWeight: 600, fontFamily: "'Share Tech Mono', monospace" },
  cardTagRight: { fontSize: 10, letterSpacing: "2px", color: "#555", fontFamily: "'Share Tech Mono', monospace" },
  cardTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 700, color: "#f0f0f0", letterSpacing: "1px", marginBottom: 10 },
  cardTitleLine: { width: 40, height: 2, background: "#e10600", borderRadius: 1 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "24px 48px", marginBottom: 32 },
  inputGroup: { display: "flex", flexDirection: "column", gap: 10, animation: "fadeUp 0.4s ease both" },
  inputLabelRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  inputLabel: { fontSize: 11, letterSpacing: "1.5px", color: "#888", textTransform: "uppercase", fontWeight: 500 },
  inputValue: { fontSize: 18, fontWeight: 600, color: "#f0f0f0", fontFamily: "'Share Tech Mono', monospace" },
  inputUnit: { fontSize: 11, color: "#666" },
  sliderWrapper: { position: "relative", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 },
  sliderFill: { position: "absolute", left: 0, top: 0, height: "100%", background: "linear-gradient(90deg, #990000, #e10600)", borderRadius: 2, pointerEvents: "none", transition: "width 0.05s" },
  slider: { position: "absolute", width: "100%", height: "4px", top: 0, left: 0, zIndex: 2 },
  sliderMinMax: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: "#444", fontFamily: "'Share Tech Mono', monospace" },
  inputHint: { fontSize: 9, color: "#444", textAlign: "center", maxWidth: "60%" },
  buttonRow: { display: "flex", gap: 12, justifyContent: "flex-end", alignItems: "center" },
  resetBtn: { background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#777", padding: "12px 24px", fontSize: 12, letterSpacing: "2px", cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", borderRadius: 2 },
  predictBtn: { background: "linear-gradient(135deg, #c00000, #e10600)", border: "none", color: "#fff", padding: "14px 36px", fontSize: 13, letterSpacing: "2px", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontWeight: 700, borderRadius: 2, boxShadow: "0 0 24px rgba(225,6,0,0.4)", transition: "opacity 0.2s" },
  predictBtnInner: { display: "flex", alignItems: "center", gap: 10 },
  errorBox: { marginTop: 16, padding: "12px 16px", background: "rgba(225,6,0,0.08)", border: "1px solid rgba(225,6,0,0.3)", borderRadius: 2, fontSize: 13, color: "#f87171", letterSpacing: "0.5px", fontFamily: "'Share Tech Mono', monospace" },
  resultCard: { border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden", animation: "resultReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) both", backdropFilter: "blur(4px)" },
  chequeredStrip: { display: "flex", height: 12, overflow: "hidden" },
  chequeredCell: { flex: 1, height: "100%" },
  resultBody: { background: "rgba(255,255,255,0.025)", padding: "36px 40px" },
  resultInner: { display: "flex", alignItems: "center", gap: 48, marginBottom: 40 },
  positionDisplay: { position: "relative", display: "flex", alignItems: "baseline", gap: 2, flexShrink: 0 },
  pLabel: { fontFamily: "'Orbitron', sans-serif", fontSize: 32, fontWeight: 400, color: "#555", letterSpacing: "2px", alignSelf: "flex-start", marginTop: 8 },
  pNumber: { fontFamily: "'Orbitron', sans-serif", fontSize: 96, fontWeight: 900, lineHeight: 1 },
  resultMeta: { display: "flex", flexDirection: "column", gap: 16 },
  positionBadge: { display: "inline-block", padding: "8px 18px", border: "1px solid", borderRadius: 2, fontSize: 13, fontFamily: "'Orbitron', sans-serif", letterSpacing: "3px", fontWeight: 700 },
  metaStats: { display: "flex", gap: 32 },
  metaStat: { display: "flex", flexDirection: "column", gap: 4 },
  metaStatLabel: { fontSize: 9, letterSpacing: "2px", color: "#555", textTransform: "uppercase", fontFamily: "'Share Tech Mono', monospace" },
  metaStatVal: { fontSize: 16, fontWeight: 600, color: "#ccc", fontFamily: "'Share Tech Mono', monospace" },
  gridViz: { borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 },
  gridVizTitle: { fontSize: 9, letterSpacing: "3px", color: "#555", marginBottom: 16, fontFamily: "'Share Tech Mono', monospace" },
  gridTrack: { display: "flex", gap: 3, alignItems: "flex-end", height: 48 },
  gridSlot: { flex: 1, height: 28, borderRadius: 1, transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)" },
  gridLabels: { display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9, color: "#444", letterSpacing: "1px", fontFamily: "'Share Tech Mono', monospace" },
  infoCard: { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 3, padding: "16px 32px" },
  infoGrid: { display: "flex", gap: 0, flexWrap: "wrap" },
  infoItem: { display: "flex", flexDirection: "column", gap: 4, padding: "8px 24px", borderRight: "1px solid rgba(255,255,255,0.05)" },
  infoLabel: { fontSize: 8, letterSpacing: "2px", color: "#444", textTransform: "uppercase", fontFamily: "'Share Tech Mono', monospace" },
  infoVal: { fontSize: 14, color: "#bbb", fontFamily: "'Orbitron', sans-serif", fontWeight: 600 },
};
