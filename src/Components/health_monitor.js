import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import './health_monitor.css';

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

function HealthMonitor() {
  const [healthData, setHealthData] = useState({
    bp_di: 0,
    bp_s: 0,
    hr: 0,
    sp02: 0
  });

  const [dataHistory, setDataHistory] = useState({
    bp_di: [],
    bp_s: [],
    hr: [],
    sp02: []
  });

  const [showAlert, setShowAlert] = useState(false);
  const [alertData, setAlertData] = useState([]);

  const canvasRefs = {
    bp: useRef(null),
    hr: useRef(null),
    sp02: useRef(null)
  };

  useEffect(() => {
    const healthRef = ref(database, 'lora_health');
    
    const unsubscribe = onValue(healthRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setHealthData({
          bp_di: data.bp_di || 0,
          bp_s: data.bp_s || 0,
          hr: data.hr || 0,
          sp02: data.sp02 || 0
        });

        // Check for abnormal values
        checkAbnormalValues(data);

        // Update history for graphs
        setDataHistory(prev => ({
          bp_di: [...prev.bp_di.slice(-29), data.bp_di || 0],
          bp_s: [...prev.bp_s.slice(-29), data.bp_s || 0],
          hr: [...prev.hr.slice(-29), data.hr || 0],
          sp02: [...prev.sp02.slice(-29), data.sp02 || 0]
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  // Draw sine wave graphs
  useEffect(() => {
    drawSineWave(canvasRefs.bp.current, dataHistory.bp_s, '#00ff00');
    drawSineWave(canvasRefs.hr.current, dataHistory.hr, '#00ff00');
    drawSineWave(canvasRefs.sp02.current, dataHistory.sp02, '#00ff00');
  }, [dataHistory]);

  const checkAbnormalValues = (data) => {
    const abnormalities = [];

    // Check Blood Pressure
    if (data.bp_s < 90) {
      abnormalities.push({
        vital: 'Blood Pressure (Systolic)',
        value: data.bp_s,
        unit: 'mmHg',
        status: 'LOW',
        normal: '120/80 mmHg',
        color: '#4ecdc4'
      });
    } else if (data.bp_s >= 140) {
      abnormalities.push({
        vital: 'Blood Pressure (Systolic)',
        value: data.bp_s,
        unit: 'mmHg',
        status: 'HIGH',
        normal: '< 120/80 mmHg',
        color: '#ff6b6b'
      });
    }

    if (data.bp_di < 60) {
      abnormalities.push({
        vital: 'Blood Pressure (Diastolic)',
        value: data.bp_di,
        unit: 'mmHg',
        status: 'LOW',
        normal: '120/80 mmHg',
        color: '#4ecdc4'
      });
    } else if (data.bp_di >= 90) {
      abnormalities.push({
        vital: 'Blood Pressure (Diastolic)',
        value: data.bp_di,
        unit: 'mmHg',
        status: 'HIGH',
        normal: '< 120/80 mmHg',
        color: '#ff6b6b'
      });
    }

    // Check Heart Rate
    if (data.hr < 60) {
      abnormalities.push({
        vital: 'Heart Rate',
        value: data.hr,
        unit: 'BPM',
        status: 'LOW',
        normal: '60-100 BPM',
        color: '#4ecdc4'
      });
    } else if (data.hr > 100) {
      abnormalities.push({
        vital: 'Heart Rate',
        value: data.hr,
        unit: 'BPM',
        status: 'HIGH',
        normal: '60-100 BPM',
        color: '#ff6b6b'
      });
    }

    // Check SpO2
    if (data.sp02 < 95 && data.sp02 > 0) {
      abnormalities.push({
        vital: 'Oxygen Saturation (SpO₂)',
        value: data.sp02,
        unit: '%',
        status: data.sp02 < 90 ? 'CRITICAL' : 'LOW',
        normal: '≥ 95%',
        color: data.sp02 < 90 ? '#ff6b6b' : '#ffd93d'
      });
    }

    // Show alert if there are abnormalities
    if (abnormalities.length > 0) {
      setAlertData(abnormalities);
      setShowAlert(true);
    }
  };

  const drawSineWave = (canvas, data, color) => {
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    const gridSpacing = 20;
    for (let i = 0; i < width; i += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i < height; i += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Find min and max for scaling
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    // Create smooth sine wave using more points
    const points = [];
    for (let i = 0; i < width; i++) {
      const dataIndex = Math.floor((i / width) * data.length);
      const value = data[dataIndex] || 0;
      const x = i;
      const y = height - ((value - min) / range) * (height - 20) - 10;
      points.push({ x, y });
    }

    // Draw the smooth wave with bezier curves
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Use quadratic curves for smooth sine wave
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    // Draw the last segment
    if (points.length > 1) {
      const lastPoint = points[points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
    }

    ctx.stroke();

    // Add extra glow
    ctx.strokeStyle = color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowBlur = 0;
  };

  const getBloodPressureStatus = () => {
    const systolic = healthData.bp_s;
    const diastolic = healthData.bp_di;

    if (systolic < 120 && diastolic < 80) return { status: 'Normal', color: '#51cf66' };
    if (systolic < 130 && diastolic < 80) return { status: 'Elevated', color: '#ffd93d' };
    if (systolic < 140 || diastolic < 90) return { status: 'High BP Stage 1', color: '#ff922b' };
    return { status: 'High BP Stage 2', color: '#ff6b6b' };
  };

  const getHeartRateStatus = () => {
    const hr = healthData.hr;
    if (hr >= 60 && hr <= 100) return { status: 'Normal', color: '#51cf66' };
    if (hr < 60) return { status: 'Low', color: '#4ecdc4' };
    return { status: 'High', color: '#ff6b6b' };
  };

  const getSpO2Status = () => {
    const sp02 = healthData.sp02;
    if (sp02 >= 95) return { status: 'Normal', color: '#51cf66' };
    if (sp02 >= 90) return { status: 'Low', color: '#ffd93d' };
    return { status: 'Critical', color: '#ff6b6b' };
  };

  const bpStatus = getBloodPressureStatus();
  const hrStatus = getHeartRateStatus();
  const sp02Status = getSpO2Status();

  return (
    <div className="health-monitor-container">
      {/* Abnormal Values Alert Modal */}
      {showAlert && (
        <div className="health-alert-overlay" onClick={() => setShowAlert(false)}>
          <div className="health-alert-modal" onClick={(e) => e.stopPropagation()}>
            <button className="alert-close-btn" onClick={() => setShowAlert(false)}>
              ✕
            </button>
            <div className="health-alert-header">
              <div className="health-alert-icon">⚠️</div>
              <h2>Abnormal Vital Signs Detected!</h2>
            </div>
            <div className="health-alert-body">
              <p className="alert-warning-text">
                The following vital signs are outside normal ranges:
              </p>
              {alertData.map((item, index) => (
                <div 
                  key={index} 
                  className="abnormal-item"
                  style={{ borderLeftColor: item.color }}
                >
                  <div className="abnormal-header">
                    <span className="abnormal-vital">{item.vital}</span>
                    <span 
                      className="abnormal-status"
                      style={{ background: item.color }}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="abnormal-details">
                    <div className="abnormal-detail">
                      <span className="detail-label">Current Value:</span>
                      <span className="detail-value" style={{ color: item.color }}>
                        {item.value} {item.unit}
                      </span>
                    </div>
                    <div className="abnormal-detail">
                      <span className="detail-label">Normal Range:</span>
                      <span className="detail-value">{item.normal}</span>
                    </div>
                  </div>
                </div>
              ))}
              <p className="alert-action-text">
                ⚕️ Please consult with medical personnel immediately!
              </p>
            </div>
            <div className="health-alert-footer">
              <button className="alert-dismiss-btn" onClick={() => setShowAlert(false)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="health-header">
        <h1 className="health-title">🏥 Health Monitoring System</h1>
        <div className="health-subtitle">Real-time Patient Vitals</div>
        <div className="live-indicator">
          <span className="pulse-dot"></span>
          <span>LIVE</span>
        </div>
      </div>

      <div className="health-cards-grid">
        {/* Blood Pressure Card */}
        <div className="health-card bp-card">
          <div className="card-header">
            <div className="card-icon">❤️</div>
            <h3>Blood Pressure</h3>
          </div>
          <div className="card-body">
            <div className="main-value">
              {healthData.bp_s || '--'} / {healthData.bp_di || '--'}
              <span className="unit">mmHg</span>
            </div>
            <div className="sub-values">
              <div className="sub-value">
                <span className="label">Systolic:</span>
                <span className="value">{healthData.bp_s || '--'}</span>
              </div>
              <div className="sub-value">
                <span className="label">Diastolic:</span>
                <span className="value">{healthData.bp_di || '--'}</span>
              </div>
            </div>
            <div className="status-badge" style={{ background: bpStatus.color }}>
              {bpStatus.status}
            </div>
          </div>
          <div className="card-graph">
            <canvas ref={canvasRefs.bp} width="400" height="120"></canvas>
          </div>
        </div>

        {/* Heart Rate Card */}
        <div className="health-card hr-card">
          <div className="card-header">
            <div className="card-icon">💓</div>
            <h3>Heart Rate</h3>
          </div>
          <div className="card-body">
            <div className="main-value">
              {healthData.hr || '--'}
              <span className="unit">BPM</span>
            </div>
            <div className="sub-info">
              Beats Per Minute
            </div>
            <div className="status-badge" style={{ background: hrStatus.color }}>
              {hrStatus.status}
            </div>
          </div>
          <div className="card-graph">
            <canvas ref={canvasRefs.hr} width="400" height="120"></canvas>
          </div>
        </div>

        {/* SpO2 Card */}
        <div className="health-card sp02-card">
          <div className="card-header">
            <div className="card-icon">🫁</div>
            <h3>Oxygen Saturation</h3>
          </div>
          <div className="card-body">
            <div className="main-value">
              {healthData.sp02 || '--'}
              <span className="unit">%</span>
            </div>
            <div className="sub-info">
              SpO₂ Level
            </div>
            <div className="status-badge" style={{ background: sp02Status.color }}>
              {sp02Status.status}
            </div>
          </div>
          <div className="card-graph">
            <canvas ref={canvasRefs.sp02} width="400" height="120"></canvas>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="health-summary">
        <h2>Vital Signs Summary</h2>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Blood Pressure:</span>
            <span className="summary-value" style={{ color: bpStatus.color }}>
              {healthData.bp_s}/{healthData.bp_di} mmHg - {bpStatus.status}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Heart Rate:</span>
            <span className="summary-value" style={{ color: hrStatus.color }}>
              {healthData.hr} BPM - {hrStatus.status}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Oxygen Level:</span>
            <span className="summary-value" style={{ color: sp02Status.color }}>
              {healthData.sp02}% - {sp02Status.status}
            </span>
          </div>
        </div>
      </div>

      {/* Reference Ranges */}
      <div className="reference-section">
        <h3>Normal Ranges</h3>
        <div className="reference-grid">
          <div className="reference-item">
            <strong>Blood Pressure:</strong> &lt; 120/80 mmHg
          </div>
          <div className="reference-item">
            <strong>Heart Rate:</strong> 60-100 BPM
          </div>
          <div className="reference-item">
            <strong>SpO₂:</strong> ≥ 95%
          </div>
        </div>
      </div>
    </div>
  );
}

export default HealthMonitor;