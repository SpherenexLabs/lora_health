import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { database } from '../firebase/config';
import { ref, onValue, set } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import './AdminDashboard.css';

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

function AdminDashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [sensorData, setSensorData] = useState({
    hr: '0',
    spo2: '0',
    bp: '120/80',
    finger: '0',
    message: 'HELLO'
  });
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const alertedValues = useRef({ hr: false, spo2: false, bp: false });
  const previousFinger = useRef('0');
  const fingerprintResetTimer = useRef(null);
  const [detectedData, setDetectedData] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin-login');
      return;
    }

    // Get current date in DD-MM-YYYY format
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    const basePath = `1_Health_${dateStr}`;
    
    // Fetch patients list
    const patientsRef = ref(database, `${basePath}/patients`);
    const unsubscribePatients = onValue(patientsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const patientsList = Object.keys(data).map(key => ({
          id: key,
          email: data[key]['1_Email'],
          age: data[key]['2_Age'],
          userId: data[key]['3_UserId'],
          registeredAt: data[key]['4_RegisteredAt'],
          lastLogin: data[key]['5_LastLogin']
        }));
        setPatients(patientsList);
      }
    });

    // Fetch sensor data
    const sensorRef = ref(database, `${basePath}/1_Sensor_Data_Shankar`);
    const unsubscribeSensor = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const newData = {
          hr: data['1_HR'] || '0',
          spo2: data['2_SPO2'] || '0',
          bp: data['3_BP'] || '120/80',
          finger: data['6_Finger'] || '0',
          message: data['7_Message'] || 'HELLO'
        };
        
        // Only show alerts if a patient is selected
        if (selectedPatient) {
          const patientEmail = selectedPatient.email;
          
          // Check heart rate
          const hr = parseInt(newData.hr);
          if (hr > 0 && (hr < 60 || hr > 100) && !alertedValues.current.hr) {
            toast.error(`⚠️ Alert for ${patientEmail}: Heart Rate is ${hr} BPM (Normal: 60-100 BPM)`, {
              position: "top-right",
              autoClose: 6000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true
            });
            // Send Telegram alert
            const alertMessage = `⚠️ <b>Heart Rate Alert!</b>\n\n👤 Patient: ${patientEmail}\n💓 Heart Rate: ${hr} BPM\n📊 Normal Range: 60-100 BPM\n⏰ Time: ${new Date().toLocaleString('en-US')}\n\n⚠️ Please check patient immediately!`;
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
            toast.error(`⚠️ Alert for ${patientEmail}: Oxygen Level is ${spo2}% (Normal: 95-100%)`, {
              position: "top-right",
              autoClose: 6000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true
            });
            // Send Telegram alert
            const alertMessage = `⚠️ <b>Oxygen Level Alert!</b>\n\n👤 Patient: ${patientEmail}\n🫁 SpO2: ${spo2}%\n📊 Normal Range: 95-100%\n⏰ Time: ${new Date().toLocaleString('en-US')}\n\n⚠️ Please check patient immediately!`;
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
              toast.error(`⚠️ Alert for ${patientEmail}: Blood Pressure is ${newData.bp} mmHg (Normal: 120/80 mmHg)`, {
                position: "top-right",
                autoClose: 6000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true
              });
              // Send Telegram alert
              const alertMessage = `⚠️ <b>Blood Pressure Alert!</b>\n\n👤 Patient: ${patientEmail}\n🩺 BP: ${newData.bp} mmHg\n📊 Normal Range: 120/80 mmHg\n⏰ Time: ${new Date().toLocaleString('en-US')}\n\n⚠️ Please check patient immediately!`;
              sendTelegramAlert(alertMessage);
              // Update message in Firebase
              set(ref(database, `${basePath}/1_Sensor_Data_Shankar/7_Message`), 'Patient Alert! take Tablet');
              alertedValues.current.bp = true;
            } else if (systolic >= 90 && systolic <= 140 && diastolic >= 60 && diastolic <= 90) {
              alertedValues.current.bp = false;
            }
          }
        }
        
        // Check fingerprint sensor
        if (newData.finger === '1' && previousFinger.current === '0') {
          const patientEmail = selectedPatient ? selectedPatient.email : 'Unknown';
          
          // Store the data when fingerprint is detected
          setDetectedData({
            hr: newData.hr,
            spo2: newData.spo2,
            bp: newData.bp,
            message: newData.message,
            patientEmail: patientEmail,
            timestamp: new Date().toISOString()
          });
          
          const alertMessage = `🚨 <b>Finger Pressed Alert!</b>\n\n👤 Patient: ${patientEmail}\n👆 Fingerprint sensor activated\n💓 HR: ${newData.hr} BPM\n🫁 SpO2: ${newData.spo2}%\n🩺 BP: ${newData.bp} mmHg\n⏰ Time: ${new Date().toLocaleString('en-US')}\n\n⚠️ Immediate attention required!`;
          sendTelegramAlert(alertMessage);
          
          if (selectedPatient) {
            toast.info(`🔔 Fingerprint detected for ${selectedPatient.email}! Data captured. Telegram alert sent.`, {
              position: "top-right",
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true
            });
          }
          
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
      unsubscribePatients();
      unsubscribeSensor();
      if (fingerprintResetTimer.current) {
        clearTimeout(fingerprintResetTimer.current);
      }
    };
  }, [isAdmin, navigate, selectedPatient]);

  // Reset alert flags when patient selection changes
  useEffect(() => {
    alertedValues.current = { hr: false, spo2: false, bp: false };
    previousFinger.current = '0';
    if (fingerprintResetTimer.current) {
      clearTimeout(fingerprintResetTimer.current);
    }
  }, [selectedPatient]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/admin-login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }

  const getHealthStatus = () => {
    if (!selectedPatient) return { status: 'Select a Patient', color: '#95a5a6' };
    
    const hr = parseInt(sensorData.hr);
    const spo2 = parseInt(sensorData.spo2);
    
    if (hr === 0 && spo2 === 0) return { status: 'No Data', color: '#95a5a6' };
    
    const hrNormal = hr >= 60 && hr <= 100;
    const spo2Normal = spo2 >= 95;
    
    if (hrNormal && spo2Normal) return { status: 'Healthy', color: '#27ae60' };
    if (!hrNormal || !spo2Normal) return { status: 'Attention Needed', color: '#e67e22' };
    return { status: 'Critical', color: '#e74c3c' };
  };

  const healthStatus = getHealthStatus();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="admin-dashboard-container">
      <ToastContainer />
      <nav className="admin-nav">
        <div className="admin-nav-content">
          <div className="admin-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <h1>Admin Dashboard</h1>
          </div>
          <div className="admin-nav-actions">
            <span className="admin-badge">Doctor/Admin</span>
            <button onClick={handleLogout} className="admin-btn-logout">Logout</button>
          </div>
        </div>
      </nav>

      <div className="admin-content">
        <div className="admin-header">
          <h2>Patient Health Monitoring System</h2>
          <p>Manage and monitor all registered patients</p>
        </div>

        <div className="patients-section">
          <div className="patients-list-container">
            <div className="admin-card patients-card">
              <div className="card-header">
                <h3>👥 Registered Patients ({patients.length})</h3>
              </div>
              <div className="patients-list">
                {patients.length === 0 ? (
                  <div className="no-patients">
                    <p>No patients registered yet</p>
                  </div>
                ) : (
                  patients.map((patient) => (
                    <div key={patient.id} className="patient-item">
                      <div className="patient-info">
                        <div className="patient-avatar">
                          {patient.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="patient-details">
                          <h4>{patient.email}</h4>
                          <p>Age: {patient.age} years</p>
                          <p className="patient-login">Last Login: {formatDate(patient.lastLogin)}</p>
                        </div>
                      </div>
                      <button 
                        className="btn-view-details"
                        onClick={() => setSelectedPatient(patient)}
                      >
                        View Details
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {selectedPatient && (
            <div className="patient-details-container">
              <div className="admin-card patient-header-card">
                <div className="patient-header-content">
                  <button 
                    className="btn-back"
                    onClick={() => setSelectedPatient(null)}
                  >
                    ← Back to List
                  </button>
                  <div className="selected-patient-info">
                    <div className="patient-avatar-large">
                      {selectedPatient.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3>{selectedPatient.email}</h3>
                      <p>Age: {selectedPatient.age} years</p>
                      <p className="registered-date">Registered: {formatDate(selectedPatient.registeredAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="status-banner" style={{ background: `linear-gradient(135deg, ${healthStatus.color}, ${healthStatus.color}dd)` }}>
                <div className="status-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div className="status-info">
                  <h3>Current Health Status</h3>
                  <p className="status-text">{healthStatus.status}</p>
                </div>
              </div>

              <div className="admin-grid">
                <div className="admin-card vital-card">
                  <div className="card-header">
                    <h3>💓 Heart Rate</h3>
                    <span className="status-indicator" style={{ background: parseInt(sensorData.hr) >= 60 && parseInt(sensorData.hr) <= 100 ? '#27ae60' : '#e74c3c' }}></span>
                  </div>
                  <div className="vital-reading">
                    <span className="vital-value">{sensorData.hr}</span>
                    <span className="vital-unit">BPM</span>
                  </div>
                  <div className="vital-info">
                    <p>Normal Range: 60-100 BPM</p>
                    <p className="vital-status">
                      {parseInt(sensorData.hr) === 0 ? 'No data' : 
                       parseInt(sensorData.hr) >= 60 && parseInt(sensorData.hr) <= 100 ? '✓ Normal' : '⚠ Abnormal'}
                    </p>
                  </div>
                </div>

                <div className="admin-card vital-card">
                  <div className="card-header">
                    <h3>🫁 Oxygen Level (SpO2)</h3>
                    <span className="status-indicator" style={{ background: parseInt(sensorData.spo2) >= 95 ? '#27ae60' : '#e74c3c' }}></span>
                  </div>
                  <div className="vital-reading">
                    <span className="vital-value">{sensorData.spo2}</span>
                    <span className="vital-unit">%</span>
                  </div>
                  <div className="vital-info">
                    <p>Normal Range: 95-100%</p>
                    <p className="vital-status">
                      {parseInt(sensorData.spo2) === 0 ? 'No data' : 
                       parseInt(sensorData.spo2) >= 95 ? '✓ Normal' : '⚠ Low'}
                    </p>
                  </div>
                </div>

                <div className="admin-card vital-card">
                  <div className="card-header">
                    <h3>🩺 Blood Pressure</h3>
                    <span className="status-indicator" style={{ background: '#3498db' }}></span>
                  </div>
                  <div className="vital-reading">
                    <span className="vital-value">{sensorData.bp}</span>
                    <span className="vital-unit">mmHg</span>
                  </div>
                  <div className="vital-info">
                    <p>Normal: 120/80 mmHg</p>
                    <p className="vital-status">✓ Monitored</p>
                  </div>
                </div>

                <div className="admin-card vital-card">
                  <div className="card-header">
                    <h3>👆 Fingerprint Auth</h3>
                    <span className="status-indicator" style={{ background: sensorData.finger === '1' ? '#27ae60' : '#95a5a6' }}></span>
                  </div>
                  <div className="vital-reading">
                    <span className="vital-value-text">{sensorData.finger === '1' ? 'Detected' : 'Not Detected'}</span>
                  </div>
                  <div className="vital-info">
                    <p>Patient Authentication</p>
                    <p className="vital-status">
                      {sensorData.finger === '1' ? '✓ Verified' : '○ Waiting'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="message-section">
                <div className="admin-card message-box">
                  <div className="card-header">
                    <h3>📨 System Message</h3>
                  </div>
                  <div className="message-display">
                    <p>{sensorData.message}</p>
                  </div>
                </div>
              </div>

              {detectedData && detectedData.patientEmail === selectedPatient.email && (
                <div className="history-section-admin">
                  <div className="admin-card history-card-admin">
                    <h3>📋 Last Fingerprint Detection Data</h3>
                    <div className="history-details-admin">
                      <div className="history-item-admin">
                        <span className="history-label-admin">💓 Heart Rate:</span>
                        <span className="history-value-admin">{detectedData.hr} BPM</span>
                      </div>
                      <div className="history-item-admin">
                        <span className="history-label-admin">🫁 Oxygen Level:</span>
                        <span className="history-value-admin">{detectedData.spo2}%</span>
                      </div>
                      <div className="history-item-admin">
                        <span className="history-label-admin">🩺 Blood Pressure:</span>
                        <span className="history-value-admin">{detectedData.bp} mmHg</span>
                      </div>
                      <div className="history-item-admin">
                        <span className="history-label-admin">💬 Message:</span>
                        <span className="history-value-admin">{detectedData.message}</span>
                      </div>
                      <div className="history-item-admin">
                        <span className="history-label-admin">⏰ Captured At:</span>
                        <span className="history-value-admin">{new Date(detectedData.timestamp).toLocaleString('en-US')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="analytics-section">
                <div className="admin-card analytics-card">
                  <h3>📊 Medical Analysis</h3>
                  <div className="analysis-grid">
                    <div className="analysis-item">
                      <span className="analysis-label">Patient Email:</span>
                      <span className="analysis-value">{selectedPatient.email}</span>
                    </div>
                    <div className="analysis-item">
                      <span className="analysis-label">Age:</span>
                      <span className="analysis-value">{selectedPatient.age} years</span>
                    </div>
                    <div className="analysis-item">
                      <span className="analysis-label">Monitoring Status:</span>
                      <span className="analysis-value">Active</span>
                    </div>
                    <div className="analysis-item">
                      <span className="analysis-label">Last Update:</span>
                      <span className="analysis-value">Real-time</span>
                    </div>
                  </div>
                </div>

                <div className="admin-card recommendations-card">
                  <h3>💡 Medical Recommendations</h3>
                  <ul className="recommendations-list">
                    <li>Monitor heart rate regularly for abnormal patterns</li>
                    <li>Ensure oxygen saturation remains above 95%</li>
                    <li>Check blood pressure trends for hypertension</li>
                    <li>Verify patient authentication via fingerprint</li>
                    <li>Review system messages for alerts</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
