import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './FuzzyLogic.css';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCM0tItu-glPhEllQZPz8h6_5ZsHTBiaMw",
  authDomain: "intel-gesture.firebaseapp.com",
  databaseURL: "https://intel-gesture-default-rtdb.firebaseio.com",
  projectId: "intel-gesture",
  storageBucket: "intel-gesture.firebasestorage.app",
  messagingSenderId: "696474188829",
  appId: "1:696474188829:web:ee4e918549569e4f621af4",
  measurementId: "G-1FK4E6M2VT"
};

const FuzzyLogic = () => {
  // State for storing sensor data
  const [sensorData, setSensorData] = useState({
    battery: 0,
    current: 0,
    voltage: 0,
    power: 0,
    history: []
  });

  // State to track connection status
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Initialize Firebase when component mounts
  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const dataRef = ref(db, 'Fuzzy_Logic');

    // Listen for live Firebase updates once
    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setIsConnected(true);
          setLastUpdated(new Date());

          // Robust numeric parsing across likely key variations
          const num = (v, fallback = 0) => {
            const n = typeof v === 'string' ? parseFloat(v) : Number(v);
            return Number.isFinite(n) ? n : fallback;
          };
          const batteryValue = num(
            data.Battery ?? data.battery ?? data.Batt ?? data.batt ?? data.SOC,
            0
          );
          const currentValue = num(
            data.Current ?? data.current ?? data.I ?? data.amps ?? data.A,
            0
          );
          const voltageValue = num(
            data.Voltage ?? data.voltage ?? data.V ?? data.volt ?? data.volts,
            0
          );

          const powerValue = voltageValue * currentValue; // P = V * I
          const timestamp = new Date().toLocaleTimeString();

          setSensorData((prev) => ({
            battery: batteryValue,
            current: currentValue,
            voltage: voltageValue,
            power: parseFloat(powerValue.toFixed(3)),
            history: [
              ...prev.history,
              {
                time: timestamp,
                battery: batteryValue,
                current: currentValue,
                voltage: voltageValue,
                power: parseFloat(powerValue.toFixed(3)),
              },
            ].slice(-20),
          }));
        } else {
          setIsConnected(false);
        }
      },
      (error) => {
        console.error('Firebase connection error:', error);
        setIsConnected(false);
      }
    );

    return () => unsubscribe();
  }, []);
  
  return (
    <div className="fuzzy-logic-container">
      <h1 className="main-title">
        <span className="title-icon">⚡</span>
    Z-Axis Wind Turbine Dashboard
        <span className="title-icon">⚡</span>
      </h1>
      
      {/* Values Display Section */}
      <section className="values-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-icon">📊</span>
            Live Values
          </h2>
          <div className={`live-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="pulse-dot"></span>
            <span>{isConnected ? 'Live Connected' : 'Disconnected'}</span>
            {lastUpdated && (
              <span className="last-updated">
                Last: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="values-grid">
          {/* Battery Value Card */}
          <div className="value-card battery-card">
            <div className="value-card-icon">🔋</div>
            <div className="value-card-content">
              <h3 className="value-title">Battery Level</h3>
              <div className="value-display">
                <span className="value-number">{isConnected ? sensorData.battery.toFixed(1) : '--'}</span>
                <span className="value-unit">%</span>
              </div>
              <div className="value-status">
                {!isConnected ? 'No Signal' : sensorData.battery > 80 ? 'Excellent' : sensorData.battery > 60 ? 'Good' : sensorData.battery > 40 ? 'Fair' : 'Low'}
              </div>
            </div>
          </div>
          
          {/* Current Value Card */}
          <div className="value-card current-card">
            <div className="value-card-icon">⚡</div>
            <div className="value-card-content">
              <h3 className="value-title">Current Draw</h3>
              <div className="value-display">
                <span className="value-number">{isConnected ? sensorData.current.toFixed(3) : '--'}</span>
                <span className="value-unit">A</span>
              </div>
              <div className="value-status">
                {!isConnected ? 'No Signal' : sensorData.current > 0.5 ? 'High Load' : 'Normal'}
              </div>
            </div>
          </div>
          
          {/* Voltage Value Card */}
          <div className="value-card voltage-card">
            <div className="value-card-icon">🔌</div>
            <div className="value-card-content">
              <h3 className="value-title">System Voltage</h3>
              <div className="value-display">
                <span className="value-number">{isConnected ? sensorData.voltage.toFixed(3) : '--'}</span>
                <span className="value-unit">V</span>
              </div>
              <div className="value-status">
                {!isConnected ? 'No Signal' : sensorData.voltage > 2.5 ? 'Stable' : 'Low'}
              </div>
            </div>
          </div>
          
          {/* Power Value Card */}
          <div className="value-card power-card">
            <div className="value-card-icon">💡</div>
            <div className="value-card-content">
              <h3 className="value-title">Power Output</h3>
              <div className="value-display">
                <span className="value-number">{isConnected ? sensorData.power.toFixed(3) : '--'}</span>
                <span className="value-unit">W</span>
              </div>
              <div className="value-status">
                {!isConnected ? 'No Signal' : sensorData.power > 1 ? 'Optimal' : 'Low Output'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className="charts-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-icon">📈</span>
            Real-time Trends
          </h2>
          <div className="trend-info">
            <span>Last 20 readings</span>
          </div>
        </div>
        
        <div className="charts-grid">
          {/* Battery Chart Card */}
          <div className="chart-card battery-chart">
            <div className="chart-header">
              <h3 className="chart-title">
                <span className="chart-icon">🔋</span>
                Battery Level Trend
              </h3>
              <div className="chart-value">{isConnected ? `${sensorData.battery.toFixed(1)}%` : 'No Data'}</div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={sensorData.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '2px solid #8884d8',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="battery" 
                    stroke="#8884d8" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#8884d8' }} 
                    activeDot={{ r: 6, fill: '#6366f1' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Current Chart Card */}
          <div className="chart-card current-chart">
            <div className="chart-header">
              <h3 className="chart-title">
                <span className="chart-icon">⚡</span>
                Current Flow Trend
              </h3>
              <div className="chart-value">{isConnected ? `${sensorData.current.toFixed(3)} A` : 'No Data'}</div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={sensorData.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '2px solid #82ca9d',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="current" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#10b981' }} 
                    activeDot={{ r: 6, fill: '#059669' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Voltage Chart Card */}
          <div className="chart-card voltage-chart">
            <div className="chart-header">
              <h3 className="chart-title">
                <span className="chart-icon">🔌</span>
                Voltage Level Trend
              </h3>
              <div className="chart-value">{isConnected ? `${sensorData.voltage.toFixed(3)} V` : 'No Data'}</div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={sensorData.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '2px solid #f59e0b',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="voltage" 
                    stroke="#f59e0b" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#f59e0b' }} 
                    activeDot={{ r: 6, fill: '#d97706' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Power Chart Card */}
          <div className="chart-card power-chart">
            <div className="chart-header">
              <h3 className="chart-title">
                <span className="chart-icon">💡</span>
                Power Output Trend
              </h3>
              <div className="chart-value">{isConnected ? `${sensorData.power.toFixed(3)} W` : 'No Data'}</div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={sensorData.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '2px solid #ec4899',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="power" 
                    stroke="#ec4899" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#ec4899' }} 
                    activeDot={{ r: 6, fill: '#db2777' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FuzzyLogic;