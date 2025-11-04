import React, { useEffect, useMemo, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import './BMS1.css';

// Firebase config (v2v-communication-d46c6)
const firebaseConfig = {
  apiKey: 'AIzaSyAXHnvNZkb00PXbG5JidbD4PbRgf7l6Lgg',
  authDomain: 'v2v-communication-d46c6.firebaseapp.com',
  databaseURL: 'https://v2v-communication-d46c6-default-rtdb.firebaseio.com',
  projectId: 'v2v-communication-d46c6',
  storageBucket: 'v2v-communication-d46c6.firebasestorage.app',
  messagingSenderId: '536888356116',
  appId: '1:536888356116:web:983424cdcaf8efdd4e2601',
  measurementId: 'G-H0YN6PE3S1',
};

// Initialize Firebase app safely (avoid duplicate init if other files also init)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getDatabase(app);

function useBatteryFirebase() {
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [values, setValues] = useState({
    Battery_Percent: 0,
    Current: 0,
    Voltage: 0,
    Temperature: 0,
    SoC: 0,
    SoD: 0,
  });
  const [history, setHistory] = useState({
    Battery_Percent: [],
    Current: [],
    Voltage: [],
    Temperature: [],
    SoC: [],
    SoD: [],
  });

  useEffect(() => {
    const dataRef = ref(db, 'Battery_Management');
    const unsub = onValue(
      dataRef,
      (snap) => {
        const d = snap.val() || {};
        // Map and coerce numbers
        const num = (v) => {
          const n = typeof v === 'string' ? parseFloat(v) : Number(v);
          return Number.isFinite(n) ? n : 0;
        };
        const v = {
          Battery_Percent: num(d.Battery_Percent ?? d.battery_percent ?? d.Battery ?? d.battery ?? d.SOC),
          Current: num(d.Current ?? d.current ?? d.I),
          Voltage: num(d.Voltage ?? d.voltage ?? d.V),
          Temperature: num(d.Temperature ?? d.temperature ?? d.Temp ?? d.temp),
          SoC: num(d.SoC ?? d.soc ?? d.Battery_Percent),
          SoD: num(d.SoD ?? d.sod),
        };
        const t = new Date().toLocaleTimeString();
        setValues(v);
        setHistory((prev) => ({
          Battery_Percent: [...prev.Battery_Percent.slice(-59), { time: t, value: v.Battery_Percent }],
          Current: [...prev.Current.slice(-59), { time: t, value: v.Current }],
          Voltage: [...prev.Voltage.slice(-59), { time: t, value: v.Voltage }],
          Temperature: [...prev.Temperature.slice(-59), { time: t, value: v.Temperature }],
          SoC: [...prev.SoC.slice(-59), { time: t, value: v.SoC }],
          SoD: [...prev.SoD.slice(-59), { time: t, value: v.SoD }],
        }));
        setConnected(true);
        setLastUpdated(new Date());
      },
      (err) => {
        console.error('Firebase read error:', err);
        setConnected(false);
      }
    );
    return () => unsub();
  }, []);

  return { connected, lastUpdated, values, history };
}

// CSS-based UI — see BMS1.css

function ValueCard({ title, value, unit, color }) {
  const display = Number.isFinite(Number(value)) ? Number(value).toFixed(unit === '%' ? 1 : 3) : '—';
  const showUnit = unit || '';
  return (
    <div className="bms1-card" style={{ ['--accent']: color }}>
      <div className="bms1-card-title">{title}</div>
      <div className="bms1-card-row">
        <div className="bms1-card-value">{display}</div>
        <div className="bms1-card-unit">{showUnit}</div>
      </div>
    </div>
  );
}

function TrendChart({ title, data, color = '#2563eb', domain }) {
  return (
    <div className="bms1-chart-card">
      <div className="bms1-chart-title">{title}</div>
      <div className="bms1-chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#94a3b8" />
            <YAxis domain={domain} tick={{ fontSize: 10, fill: '#64748b' }} stroke="#94a3b8" width={48} />
            <Tooltip contentStyle={{ borderRadius: 8 }} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function BMS1() {
  const { connected, lastUpdated, values, history } = useBatteryFirebase();

  const power = useMemo(() => (values.Voltage * values.Current), [values.Voltage, values.Current]);
  const [tempAlertOpen, setTempAlertOpen] = useState(false);

  // Open/close high temperature alert dynamically
  useEffect(() => {
    if (Number(values.Temperature) > 40) {
      setTempAlertOpen(true);
    } else {
      setTempAlertOpen(false);
    }
  }, [values.Temperature]);

  return (
    <div className="bms1-page">
      <div className="bms1-header">
        <div className="bms1-title">Battery Management — Live</div>
        <div className={`bms1-live ${connected ? 'ok' : 'bad'}`}>
          <span className="bms1-dot" />
          {connected ? 'Connected' : 'Disconnected'}
          {lastUpdated && (
            <span className="bms1-last">• {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Value cards (separate from charts) */}
      <div className="bms1-cards-grid">
        <ValueCard title="Battery %" value={values.Battery_Percent} unit="%" color="#22c55e" />
        <ValueCard title="Current" value={values.Current} unit="A" color="#f59e0b" />
        <ValueCard title="Voltage" value={values.Voltage} unit="V" color="#3b82f6" />
        <ValueCard title="Temperature" value={values.Temperature} unit="°C" color="#f97316" />
        <ValueCard title="SoC" value={values.SoC} unit="%" color="#8b5cf6" />
        <ValueCard title="SoD" value={values.SoD} unit="%" color="#ef4444" />
        <ValueCard title="Power" value={power} unit="W" color="#14b8a6" />
      </div>

      {/* Charts (separate cards) */}
      <div className="bms1-section-title">Real-time Trends</div>
      <div className="bms1-charts-grid">
        <TrendChart title="Battery %" data={history.Battery_Percent} color="#22c55e" domain={[0, 100]} />
        <TrendChart title="Current (A)" data={history.Current} color="#f59e0b" />
        <TrendChart title="Voltage (V)" data={history.Voltage} color="#3b82f6" />
        <TrendChart title="Temperature (°C)" data={history.Temperature} color="#f97316" domain={[0, 100]} />
        <TrendChart title="SoC (%)" data={history.SoC} color="#8b5cf6" domain={[0, 100]} />
        <TrendChart title="SoD (%)" data={history.SoD} color="#ef4444" domain={[0, 100]} />
      </div>

      {/* High Temperature Alert Modal */}
      {tempAlertOpen && (
        <div className="bms1-modal-overlay" role="dialog" aria-modal="true" aria-label="High temperature alert">
          <div className="bms1-modal">
            <button className="bms1-modal-close" aria-label="Dismiss alert" onClick={() => setTempAlertOpen(false)}>
              ×
            </button>
            <div className="bms1-modal-title">High Temperature</div>
            <div className="bms1-modal-body">
              Current temperature is <strong>{Number(values.Temperature).toFixed(1)} °C</strong> which is above the safe threshold of 40 °C.
              Please reduce load or check cooling.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
