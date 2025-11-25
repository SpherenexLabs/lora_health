import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../firebase/config';
import { ref, onValue, set, push } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import './Dashboard.css';

// Telegram configuration
const TELEGRAM_BOT_TOKEN = '8358628620:AAHJgdrn2ZDEdOijz1QDAP3c6SfBBIXLYUI';
const TELEGRAM_CHAT_ID = '1848849300';

const sendTelegramAlert = async (message) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    console.log('✅ Telegram alert sent successfully');
  } catch (error) {
    console.error('❌ Failed to send Telegram alert:', error);
  }
};

function Dashboard() {
  const [sensorData, setSensorData] = useState({
    hr: '0',
    spo2: '0',
    bp: '120/80',
    finger: '0',
    message: 'HELLO'
  });
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const alertedValues = useRef({ hr: false, spo2: false, bp: false });
  const previousFinger = useRef('0');
  const fingerprintResetTimer = useRef(null);
  const [detectedData, setDetectedData] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Get current date in DD-MM-YYYY format
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    const basePath = `1_Health_${dateStr}`;

    const sensorRef = ref(database, `${basePath}/1_Sensor_Data_Shankar`);
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const newData = {
          hr: data['1_HR'] || '0',
          spo2: data['2_SPO2'] || '0',
          bp: data['3_BP'] || '120/80',
          finger: data['6_Finger'] || '0',
          message: data['7_Message'] || 'HELLO'
        };
        
        // Save previous data to history if values have changed
        if (sensorData.hr !== '0' || sensorData.spo2 !== '0') {
          const hasChanged = 
            sensorData.hr !== newData.hr || 
            sensorData.spo2 !== newData.spo2 || 
            sensorData.bp !== newData.bp || 
            sensorData.finger !== newData.finger || 
            sensorData.message !== newData.message;
          
          if (hasChanged) {
            const historyRef = ref(database, `${basePath}/history/${currentUser.uid}`);
            push(historyRef, {
              '1_HR': sensorData.hr,
              '2_SPO2': sensorData.spo2,
              '3_BP': sensorData.bp,
              '6_Finger': sensorData.finger,
              '7_Message': sensorData.message,
              '8_Timestamp': new Date().toISOString(),
              '9_PatientEmail': currentUser.email
            });
          }
        }
        
        // Check heart rate
        const hr = parseInt(newData.hr);
        if (hr > 0 && (hr < 60 || hr > 100) && !alertedValues.current.hr) {
          toast.error(`⚠️ Alert: Heart Rate is ${hr} BPM (Normal: 60-100 BPM)`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
          });
          // Send Telegram alert
          const alertMessage = `⚠️ <b>Heart Rate Alert!</b>\n\n👤 Patient: ${currentUser.email}\n💓 Heart Rate: ${hr} BPM\n📊 Normal Range: 60-100 BPM\n⏰ Time: ${new Date().toLocaleString('en-US')}\n\n⚠️ Please check patient immediately!`;
          sendTelegramAlert(alertMessage);
          // Update message in Firebase
          set(ref(database, `${basePath}/1_Sensor_Data_Shankar/7_Message`), 'Patient Alert! take Tablet');
          alertedValues.current.hr = true;
        } else if (hr >= 60 && hr <= 100) {
          alertedValues.current.hr = false;
        }
        
        // Check oxygen level
        const spo2 = parseInt(newData.spo2);
        if (spo2 > 0 && spo2 < 95 && !alertedValues.current.spo2) {
          toast.error(`⚠️ Alert: Oxygen Level is ${spo2}% (Normal: 95-100%)`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
          });
          // Send Telegram alert
          const alertMessage = `⚠️ <b>Oxygen Level Alert!</b>\n\n👤 Patient: ${currentUser.email}\n🫁 SpO2: ${spo2}%\n📊 Normal Range: 95-100%\n⏰ Time: ${new Date().toLocaleString('en-US')}\n\n⚠️ Please check patient immediately!`;
          sendTelegramAlert(alertMessage);
          // Update message in Firebase
          set(ref(database, `${basePath}/1_Sensor_Data_Shankar/7_Message`), 'Patient Alert! take Tablet');
          alertedValues.current.spo2 = true;
        } else if (spo2 >= 95) {
          alertedValues.current.spo2 = false;
        }
        
        // Check blood pressure
        const bpParts = newData.bp.split('/');
        if (bpParts.length === 2) {
          const systolic = parseInt(bpParts[0]);
          const diastolic = parseInt(bpParts[1]);
          if ((systolic > 140 || systolic < 90 || diastolic > 90 || diastolic < 60) && !alertedValues.current.bp) {
            toast.error(`⚠️ Alert: Blood Pressure is ${newData.bp} mmHg (Normal: 120/80 mmHg)`, {
              position: "top-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true
            });
            // Send Telegram alert
            const alertMessage = `⚠️ <b>Blood Pressure Alert!</b>\n\n👤 Patient: ${currentUser.email}\n🩺 BP: ${newData.bp} mmHg\n📊 Normal Range: 120/80 mmHg\n⏰ Time: ${new Date().toLocaleString('en-US')}\n\n⚠️ Please check patient immediately!`;
            sendTelegramAlert(alertMessage);
            // Update message in Firebase
            set(ref(database, `${basePath}/1_Sensor_Data_Shankar/7_Message`), 'Patient Alert! take Tablet');
            alertedValues.current.bp = true;
          } else if (systolic >= 90 && systolic <= 140 && diastolic >= 60 && diastolic <= 90) {
            alertedValues.current.bp = false;
          }
        }
        
        // Check fingerprint sensor
        if (newData.finger === '1' && previousFinger.current === '0') {
          // Store the data when fingerprint is detected
          setDetectedData({
            hr: newData.hr,
            spo2: newData.spo2,
            bp: newData.bp,
            message: newData.message,
            timestamp: new Date().toISOString()
          });
          
          const alertMessage = `🚨 <b>Finger Pressed Alert!</b>\n\n👤 Patient: ${currentUser.email}\n👆 Fingerprint sensor activated\n💓 HR: ${newData.hr} BPM\n🫁 SpO2: ${newData.spo2}%\n🩺 BP: ${newData.bp} mmHg\n⏰ Time: ${new Date().toLocaleString('en-US')}\n\n⚠️ Immediate attention required!`;
          sendTelegramAlert(alertMessage);
          toast.info('🔔 Fingerprint detected! Data captured. Telegram alert sent.', {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
          });
          
          // Auto-reset fingerprint to 0 after 3 seconds
          if (fingerprintResetTimer.current) {
            clearTimeout(fingerprintResetTimer.current);
          }
          fingerprintResetTimer.current = setTimeout(() => {
            set(ref(database, `${basePath}/1_Sensor_Data_Shankar/6_Finger`), '0');
          }, 3000);
        }
        previousFinger.current = newData.finger;
        
        setSensorData(newData);
      }
    });

    return () => {
      unsubscribe();
      if (fingerprintResetTimer.current) {
        clearTimeout(fingerprintResetTimer.current);
      }
    };
  }, [currentUser, navigate]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }

  const getStatusColor = (value, type) => {
    if (type === 'hr') {
      const hr = parseInt(value);
      if (hr === 0) return '#95a5a6';
      if (hr >= 60 && hr <= 100) return '#27ae60';
      return '#e74c3c';
    }
    if (type === 'spo2') {
      const spo2 = parseInt(value);
      if (spo2 === 0) return '#95a5a6';
      if (spo2 >= 95) return '#27ae60';
      return '#e74c3c';
    }
    return '#3498db';
  };

  return (
    <div className="dashboard-container">
      <ToastContainer />
      <nav className="dashboard-nav">
        <div className="nav-content">
          <h1>Health Monitor</h1>
          <div className="nav-actions">
            <span className="user-email">{currentUser?.email}</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome to Your Health Dashboard</h2>
          <p>Real-time monitoring of your vital health parameters</p>
        </div>

        <div className="sensor-grid">
          <div className="sensor-card" style={{ borderLeftColor: getStatusColor(sensorData.hr, 'hr') }}>
            <div className="sensor-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div className="sensor-info">
              <h3>Heart Rate</h3>
              <p className="sensor-value">{sensorData.hr} <span className="unit">BPM</span></p>
              <p className="sensor-label">Beats per minute</p>
            </div>
          </div>

          <div className="sensor-card" style={{ borderLeftColor: getStatusColor(sensorData.spo2, 'spo2') }}>
            <div className="sensor-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="sensor-info">
              <h3>Oxygen Level</h3>
              <p className="sensor-value">{sensorData.spo2} <span className="unit">%</span></p>
              <p className="sensor-label">Blood oxygen saturation</p>
            </div>
          </div>

          <div className="sensor-card" style={{ borderLeftColor: '#3498db' }}>
            <div className="sensor-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
            </div>
            <div className="sensor-info">
              <h3>Blood Pressure</h3>
              <p className="sensor-value">{sensorData.bp} <span className="unit">mmHg</span></p>
              <p className="sensor-label">Systolic/Diastolic</p>
            </div>
          </div>

          <div className="sensor-card" style={{ borderLeftColor: '#9b59b6' }}>
            <div className="sensor-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <div className="sensor-info">
              <h3>Fingerprint</h3>
              <p className="sensor-value">{sensorData.finger === '1' ? 'Detected' : 'Not Detected'}</p>
              <p className="sensor-label">Authentication status</p>
            </div>
          </div>

          <div className="message-card">
            <div className="message-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
            </div>
            <div className="message-content">
              <h3>System Message</h3>
              <p className="message-text">{sensorData.message}</p>
            </div>
          </div>
        </div>

        {detectedData && (
          <div className="history-section">
            <div className="info-card history-card">
              <h3>📋 Last Fingerprint Detection Data</h3>
              <div className="history-details">
                <div className="history-item">
                  <span className="history-label">💓 Heart Rate:</span>
                  <span className="history-value">{detectedData.hr} BPM</span>
                </div>
                <div className="history-item">
                  <span className="history-label">🫁 Oxygen Level:</span>
                  <span className="history-value">{detectedData.spo2}%</span>
                </div>
                <div className="history-item">
                  <span className="history-label">🩺 Blood Pressure:</span>
                  <span className="history-value">{detectedData.bp} mmHg</span>
                </div>
                <div className="history-item">
                  <span className="history-label">💬 Message:</span>
                  <span className="history-value">{detectedData.message}</span>
                </div>
                <div className="history-item">
                  <span className="history-label">⏰ Captured At:</span>
                  <span className="history-value">{new Date(detectedData.timestamp).toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="info-section">
          <div className="info-card">
            <h3>📊 Health Tips</h3>
            <ul>
              <li>Normal heart rate: 60-100 BPM</li>
              <li>Normal oxygen level: 95-100%</li>
              <li>Normal blood pressure: 120/80 mmHg</li>
              <li>Stay hydrated and exercise regularly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
