import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Carmonitor.css';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhLCi6JBT5ELkAFxTplKBBDdRdpATzQxI",
  authDomain: "smart-medicine-vending-machine.firebaseapp.com",
  databaseURL: "https://smart-medicine-vending-machine-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-medicine-vending-machine",
  storageBucket: "smart-medicine-vending-machine.firebasestorage.app",
  messagingSenderId: "705021997077",
  appId: "1:705021997077:web:5af9ec0b267e597e1d5e1c",
  measurementId: "G-PH0XLJSYVS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const Carmonitor = () => {
  const [alcoholLevel, setAlcoholLevel] = useState(0);
  const [alcoholPercent, setAlcoholPercent] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [alcoholFlag, setAlcoholFlag] = useState(0);
  const [crashFlag, setCrashFlag] = useState(0);
  const [flameFlag, setFlameFlag] = useState(0);
  
  const [alcoholData, setAlcoholData] = useState([]);
  const [speedData, setSpeedData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  const timeRef = useRef(0);
  const prevAlcoholFlag = useRef(0);
  const prevCrashFlag = useRef(0);
  const prevFlameFlag = useRef(0);

  // Listen to Firebase data
  useEffect(() => {
    const carmonitorRef = ref(database, 'carmonitor');
    const unsubscribe = onValue(carmonitorRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAlcoholLevel(data.alcohol_level || 0);
        setAlcoholPercent(data.alcohol_percent || 0);
        setSpeed(data.speed || 0);
        setAlcoholFlag(data.alcohol_flag || 0);
        setCrashFlag(data.crash_flag || 0);
        setFlameFlag(data.flame_flag || 0);
      }
    });

    return () => unsubscribe();
  }, []);

  // Monitor flags and create alerts
  useEffect(() => {
    const checkAndCreateAlert = (currentFlag, prevFlag, alertType, message) => {
      if (currentFlag === 1 && prevFlag !== 1) {
        // Flag changed to 1, create alert
        const alertRef = ref(database, 'carmonitor/Alert');
        set(alertRef, 1);
        
        // Show alert
        const newAlert = {
          id: Date.now(),
          type: alertType,
          message: message,
          timestamp: new Date().toLocaleTimeString()
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 5)); // Keep last 5 alerts
      }
    };

    checkAndCreateAlert(alcoholFlag, prevAlcoholFlag.current, 'alcohol', '⚠️ Alcohol Detected!');
    checkAndCreateAlert(crashFlag, prevCrashFlag.current, 'crash', '🚨 Crash Detected!');
    checkAndCreateAlert(flameFlag, prevFlameFlag.current, 'flame', '🔥 Flame Detected!');

    // Check if all flags are 0, then set Alert to 0
    if (alcoholFlag === 0 && crashFlag === 0 && flameFlag === 0) {
      const alertRef = ref(database, 'carmonitor/Alert');
      set(alertRef, 0);
    }

    // Update previous values
    prevAlcoholFlag.current = alcoholFlag;
    prevCrashFlag.current = crashFlag;
    prevFlameFlag.current = flameFlag;
  }, [alcoholFlag, crashFlag, flameFlag]);

  // Generate sine wave data for alcohol level
  useEffect(() => {
    const generateAlcoholWave = () => {
      const data = [];
      const points = 100;
      
      for (let i = 0; i < points; i++) {
        const x = (i / 50) * Math.PI + timeRef.current;
        data.push({
          time: i,
          value: Math.sin(x) * (alcoholLevel * 10) + alcoholLevel
        });
      }
      
      setAlcoholData(data);
    };

    generateAlcoholWave();
    const interval = setInterval(() => {
      timeRef.current += 0.1;
      generateAlcoholWave();
    }, 100);

    return () => clearInterval(interval);
  }, [alcoholLevel]);

  // Generate sine wave data for speed
  useEffect(() => {
    const generateSpeedWave = () => {
      const data = [];
      const points = 100;
      
      for (let i = 0; i < points; i++) {
        const x = (i / 50) * Math.PI + timeRef.current * 1.5;
        data.push({
          time: i,
          value: Math.sin(x) * (speed * 0.3) + speed
        });
      }
      
      setSpeedData(data);
    };

    generateSpeedWave();
  }, [speed, timeRef.current]);

  // Remove alert after 5 seconds
  useEffect(() => {
    if (alerts.length > 0) {
      const timer = setTimeout(() => {
        setAlerts(prev => prev.slice(0, -1));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [alerts]);

  return (
    <div className="carmonitor-container">
      <div className="header">
        <h1>🚗 Car Monitor System</h1>
        <p>Real-time vehicle monitoring and safety alerts</p>
      </div>

      {/* Alert Notifications */}
      <div className="alerts-container">
        {alerts.map((alert) => (
          <div key={alert.id} className={`alert-box alert-${alert.type}`}>
            <div className="alert-content">
              <span className="alert-message">{alert.message}</span>
              <span className="alert-time">{alert.timestamp}</span>
            </div>
            <button 
              className="alert-close"
              onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Data Cards */}
      <div className="cards-grid">
        <div className="data-card card-blue">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h3>Alcohol Level</h3>
          <div className="card-value">{alcoholLevel.toFixed(5)}</div>
          <div className="card-label">BAC Level</div>
          {alcoholFlag === 1 && <div className="warning-badge">⚠️ WARNING</div>}
        </div>

        <div className="data-card card-green">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <h3>Alcohol Percentage</h3>
          <div className="card-value">{alcoholPercent.toFixed(4)}%</div>
          <div className="card-label">Percentage</div>
          {alcoholFlag === 1 && <div className="warning-badge">⚠️ WARNING</div>}
        </div>

        <div className="data-card card-orange">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44z"/>
              <path d="M10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"/>
            </svg>
          </div>
          <h3>Speed</h3>
          <div className="card-value">{speed.toFixed(5)}</div>
          <div className="card-label">km/h</div>
          {crashFlag === 1 && <div className="warning-badge">🚨 CRASH</div>}
        </div>
      </div>

      {/* Graphs Section */}
      <div className="graphs-section">
        <div className="graph-container">
          <div className="graph-header">
            <h3>📊 Alcohol Level Wave</h3>
            <span className="graph-value">{alcoholLevel.toFixed(5)}</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={alcoholData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.5} />
              <XAxis dataKey="time" stroke="#999" tick={{ fontSize: 11 }} />
              <YAxis stroke="#999" tick={{ fontSize: 11 }} domain={[0, 'auto']} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  padding: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#667eea" 
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="graph-container">
          <div className="graph-header">
            <h3>📈 Speed Wave</h3>
            <span className="graph-value">{speed.toFixed(5)} km/h</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={speedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.5} />
              <XAxis dataKey="time" stroke="#999" tick={{ fontSize: 11 }} />
              <YAxis stroke="#999" tick={{ fontSize: 11 }} domain={[0, 'auto']} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '2px solid #f2994a',
                  borderRadius: '8px',
                  padding: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#f2994a" 
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="status-section">
        <div className={`status-item ${alcoholFlag === 1 ? 'status-danger' : 'status-safe'}`}>
          <div className="status-icon">
            {alcoholFlag === 1 ? '⚠️' : '✓'}
          </div>
          <div className="status-info">
            <h4>Alcohol Detection</h4>
            <p>{alcoholFlag === 1 ? 'Alcohol Detected!' : 'No Alcohol'}</p>
          </div>
        </div>

        <div className={`status-item ${crashFlag === 1 ? 'status-danger' : 'status-safe'}`}>
          <div className="status-icon">
            {crashFlag === 1 ? '🚨' : '✓'}
          </div>
          <div className="status-info">
            <h4>Crash Detection</h4>
            <p>{crashFlag === 1 ? 'Crash Detected!' : 'No Crash'}</p>
          </div>
        </div>

        <div className={`status-item ${flameFlag === 1 ? 'status-danger' : 'status-safe'}`}>
          <div className="status-icon">
            {flameFlag === 1 ? '🔥' : '✓'}
          </div>
          <div className="status-info">
            <h4>Flame Detection</h4>
            <p>{flameFlag === 1 ? 'Flame Detected!' : 'No Flame'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Carmonitor;
