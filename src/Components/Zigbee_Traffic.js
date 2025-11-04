import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push } from 'firebase/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Zigbee_Traffic.css';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAXHnvNZkb00PXbG5JidbD4PbRgf7l6Lgg",
  authDomain: "v2v-communication-d46c6.firebaseapp.com",
  databaseURL: "https://v2v-communication-d46c6-default-rtdb.firebaseio.com",
  projectId: "v2v-communication-d46c6",
  storageBucket: "v2v-communication-d46c6.firebasestorage.app",
  messagingSenderId: "536888356116",
  appId: "1:536888356116:web:983424cdcaf8efdd4e2601",
  measurementId: "G-H0YN6PE3S1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const Zigbee_Traffic = () => {
  const [selectedLane, setSelectedLane] = useState(null);
  const [currentLane, setCurrentLane] = useState(null);
  const [currentPath, setCurrentPath] = useState(null);
  const [laneHistory, setLaneHistory] = useState([]);
  const [graphData, setGraphData] = useState([]);
  const timeRef = useRef(0);

  // Listen to Firebase data for Lane
  useEffect(() => {
    const laneRef = ref(database, 'Zigbee_Traffic/Lane');
    const unsubscribe = onValue(laneRef, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) {
        setCurrentLane(data);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firebase data for Path
  useEffect(() => {
    const pathRef = ref(database, 'Zigbee_Traffic/Path');
    const unsubscribe = onValue(pathRef, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) {
        setCurrentPath(data);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to lane history from Firebase
  useEffect(() => {
    const historyRef = ref(database, 'Zigbee_Traffic/History');
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const historyArray = Object.values(data).slice(-50); // Keep last 50 entries
        setLaneHistory(historyArray);
      }
    });

    return () => unsubscribe();
  }, []);

  // Generate and animate sine wave data
  useEffect(() => {
    const generateInitialData = () => {
      const data = [];
      const points = 200; // More points for smoother waves
      
      for (let i = 0; i < points; i++) {
        data.push({
          time: i,
          lane1: 0,
          lane2: 0,
          lane3: 0,
          lane4: 0
        });
      }
      
      setGraphData(data);
    };

    generateInitialData();
  }, []);

  // Animate graph with real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setGraphData(prevData => {
        const newData = prevData.map((point, index) => {
          // Create smooth sine waves with different frequencies for each lane
          const x = (index / 50) * Math.PI + timeRef.current; // Adjusted for smoother waves
          
          return {
            time: index,
            lane1: Math.sin(x * 1) * 8 + 10,           // Standard frequency
            lane2: Math.sin(x * 1.3) * 8 + 10,         // Slightly faster
            lane3: Math.sin(x * 0.7) * 8 + 10,         // Slower frequency
            lane4: Math.sin(x * 1.8) * 8 + 10          // Fastest frequency
          };
        });
        
        timeRef.current += 0.1; // Smooth animation speed
        return newData;
      });
    }, 50); // Update every 50ms for smooth animation

    return () => clearInterval(interval);
  }, []);

  // Handle lane selection and send to Firebase
  const handleLaneClick = (laneNumber) => {
    setSelectedLane(laneNumber);
    const laneRef = ref(database, 'Zigbee_Traffic/Lane');
    const historyRef = ref(database, 'Zigbee_Traffic/History');
    
    // Send current lane
    set(laneRef, laneNumber)
      .then(() => {
        console.log(`Lane ${laneNumber} sent to Firebase successfully`);
        
        // Add to history
        push(historyRef, {
          lane: laneNumber,
          timestamp: Date.now(),
          time: new Date().toLocaleTimeString()
        });
      })
      .catch((error) => {
        console.error('Error sending data to Firebase:', error);
      });
  };

  const lanes = [
    { id: 1, name: 'Lane 1', color: 'lane-blue' },
    { id: 2, name: 'Lane 2', color: 'lane-green' },
    { id: 3, name: 'Lane 3', color: 'lane-orange' },
    { id: 4, name: 'Lane 4', color: 'lane-purple' }
  ];

  return (
    <div className="zigbee-traffic-container">
      <div className="header">
        <h1>Zigbee Traffic Management</h1>
        <p>Select a lane to activate</p>
      </div>

      <div className="lanes-grid">
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className={`lane-card ${lane.color} ${currentLane === lane.id ? 'active' : ''}`}
            onClick={() => handleLaneClick(lane.id)}
          >
            <div className="lane-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </div>
            <h2>{lane.name}</h2>
            <div className="lane-number">{lane.id}</div>
            {currentLane === lane.id && (
              <div className="active-badge">
                <span>ACTIVE</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="graph-section">
        <div className="graph-header">
          <h2>Lane Signal Waves</h2>
          <p>Real-time sine wave visualization for each lane</p>
        </div>
        
        <div className="graph-container">
          <ResponsiveContainer width="100%" height={450}>
            <LineChart 
              data={graphData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.5} />
              <XAxis 
                dataKey="time" 
                label={{ value: 'Time', position: 'insideBottom', offset: -10, style: { fontSize: 14, fill: '#666' } }}
                stroke="#999"
                tick={{ fontSize: 12 }}
                domain={[0, 200]}
              />
              <YAxis 
                label={{ value: 'Amplitude', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#666' } }}
                stroke="#999"
                tick={{ fontSize: 12 }}
                domain={[0, 20]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  padding: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
                labelStyle={{ fontWeight: 'bold', marginBottom: 5 }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="lane1" 
                stroke="#667eea" 
                strokeWidth={currentLane === 1 ? 5 : 3}
                dot={false}
                name="Lane 1"
                opacity={currentLane === 1 || currentLane === null ? 1 : 0.25}
                animationDuration={300}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="lane2" 
                stroke="#56ab2f" 
                strokeWidth={currentLane === 2 ? 5 : 3}
                dot={false}
                name="Lane 2"
                opacity={currentLane === 2 || currentLane === null ? 1 : 0.25}
                animationDuration={300}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="lane3" 
                stroke="#f2994a" 
                strokeWidth={currentLane === 3 ? 5 : 3}
                dot={false}
                name="Lane 3"
                opacity={currentLane === 3 || currentLane === null ? 1 : 0.25}
                animationDuration={300}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="lane4" 
                stroke="#c94b4b" 
                strokeWidth={currentLane === 4 ? 5 : 3}
                dot={false}
                name="Lane 4"
                opacity={currentLane === 4 || currentLane === null ? 1 : 0.25}
                animationDuration={300}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {laneHistory.length > 0 && (
          <div className="history-section">
            <h3>Recent Lane Selections</h3>
            <div className="history-list">
              {laneHistory.slice(-10).reverse().map((item, index) => (
                <div key={index} className={`history-item lane-${item.lane}`}>
                  <span className="history-lane">Lane {item.lane}</span>
                  <span className="history-time">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">Current Lane:</span>
          <span className="status-value">{currentPath || 'None'}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Last Selected:</span>
          <span className="status-value">{selectedLane || 'None'}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Total Selections:</span>
          <span className="status-value">{laneHistory.length}</span>
        </div>
      </div>
    </div>
  );
};

export default Zigbee_Traffic;
