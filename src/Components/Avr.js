import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import './Avr.css';

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

function Avr() {
  const [avrData, setAvrData] = useState({
    Distance1: 0,
    Distance2: 0,
    Distance3: 0,
    Node: 0,
    Node1: 0,
    Node2: 0,
    UpdatedAt: 0
  });

  const [previousData, setPreviousData] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ node: '', distance: '', value: 0 });

  useEffect(() => {
    const avrRef = ref(database, 'AVR');
    
    const unsubscribe = onValue(avrRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAvrData(data);
        
        // Check for faults
        checkFaults(data);
        setPreviousData(data);
      }
    });

    // Auto-refresh every 2 seconds
    const refreshInterval = setInterval(() => {
      // Force re-render to update timestamps
      setAvrData(prev => ({ ...prev }));
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const checkFaults = (data) => {
    // Check Node (Red Node)
    if (data.Node === 1) {
      const distances = [
        { num: 1, val: data.Distance1 },
        { num: 2, val: data.Distance2 },
        { num: 3, val: data.Distance3 }
      ];
      distances.forEach((dist) => {
        if (dist.val > 0) {
          setAlertMessage({
            node: 'Red Node (Node)',
            distance: `Distance ${dist.num}`,
            value: dist.val
          });
          setShowAlert(true);
        }
      });
    }

    // Check Node1 (Yellow Node)
    if (data.Node1 === 1) {
      const distances = [
        { num: 1, val: data.Distance1 },
        { num: 2, val: data.Distance2 },
        { num: 3, val: data.Distance3 }
      ];
      distances.forEach((dist) => {
        if (dist.val > 0) {
          setAlertMessage({
            node: 'Yellow Node (Node1)',
            distance: `Distance ${dist.num}`,
            value: dist.val
          });
          setShowAlert(true);
        }
      });
    }

    // Check Node2 (Green Node)
    if (data.Node2 === 1) {
      const distances = [
        { num: 1, val: data.Distance1 },
        { num: 2, val: data.Distance2 },
        { num: 3, val: data.Distance3 }
      ];
      distances.forEach((dist) => {
        if (dist.val > 0) {
          setAlertMessage({
            node: 'Green Node (Node2)',
            distance: `Distance ${dist.num}`,
            value: dist.val
          });
          setShowAlert(true);
        }
      });
    }
  };

  const renderDistanceCard = (distanceNum, distanceValue, color, nodeValue, isLast = false) => {
    return (
      <div className="distance-card-container" key={distanceNum}>
        <div className={`distance-card ${color}-distance`}>
          <div className="distance-card-header">
            <h4>Distance {distanceNum}</h4>
          </div>
          <div className="distance-card-value">
            {nodeValue === 1 ? distanceValue : '-'}
          </div>
          <div className="distance-card-label">
            {nodeValue === 1 ? 'meters' : 'N/A'}
          </div>
        </div>
        
        {!isLast && (
          <div className="distance-link-arrow">
            <div className="distance-arrow-line"></div>
            <div className="distance-arrow-head">➤</div>
          </div>
        )}
      </div>
    );
  };

  const renderNodeSection = (nodeName, nodeValue, color) => {
    return (
      <div className={`node-section ${color}-section`} key={nodeName}>
        <div className="node-section-header">
          <div className={`node-title ${color}-title`}>
            <h2>{nodeName}</h2>
            <div className={`node-badge ${color}-badge`}>
              {nodeValue === 1 ? '⚠️ FAULT' : '✓ NORMAL'}
            </div>
          </div>
          <div className="node-info">
            <span className="node-label">Node Status:</span>
            <span className={`node-status-value ${nodeValue === 1 ? 'fault-active' : 'inactive'}`}>
              {nodeValue === 1 ? 'Active/Fault' : 'Inactive'}
            </span>
            <span className="node-label">Node Value:</span>
            <span className="node-data">{nodeValue}</span>
          </div>
        </div>

        {/* Always show distance cards, but hide values when nodeValue is 0 */}
        <div className="linked-distances">
          {renderDistanceCard(1, avrData.Distance1, color, nodeValue)}
          {renderDistanceCard(2, avrData.Distance2, color, nodeValue)}
          {renderDistanceCard(3, avrData.Distance3, color, nodeValue, true)}
        </div>
      </div>
    );
  };

  return (
    <div className="avr-container">
      {/* Custom Alert Modal */}
      {showAlert && (
        <div className="alert-overlay" onClick={() => setShowAlert(false)}>
          <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="alert-header">
              <div className="alert-icon">⚠️</div>
              <h2>FAULT DETECTED!</h2>
            </div>
            <div className="alert-body">
              <div className="alert-detail">
                <span className="alert-label">Node:</span>
                <span className="alert-value">{alertMessage.node}</span>
              </div>
              <div className="alert-detail">
                <span className="alert-label">{alertMessage.distance}:</span>
                <span className="alert-value">{alertMessage.value}</span>
              </div>
              <p className="alert-message">Immediate attention required!</p>
            </div>
            <div className="alert-footer">
              <button className="alert-button" onClick={() => setShowAlert(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="header-section">
        <h1 className="main-title">AVR Node Monitoring System</h1>
        <div className="update-info">
          <span>Last Updated: {new Date(avrData.UpdatedAt || Date.now()).toLocaleString()}</span>
          <span className="refresh-indicator">🔄 Auto-refresh enabled</span>
        </div>
      </div>

      <div className="nodes-display">
        {renderNodeSection('Red Node', avrData.Node, 'red')}
        {renderNodeSection('Yellow Node', avrData.Node1, 'yellow')}
        {renderNodeSection('Green Node', avrData.Node2, 'green')}
      </div>

      <div className="legend-section">
        <h3>Legend</h3>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color red-legend"></div>
            <span>Red Node - Primary Node</span>
          </div>
          <div className="legend-item">
            <div className="legend-color yellow-legend"></div>
            <span>Yellow Node - Secondary Node</span>
          </div>
          <div className="legend-item">
            <div className="legend-color green-legend"></div>
            <span>Green Node - Tertiary Node</span>
          </div>
        </div>
      </div>

      <div className="info-panel">
        <h3>System Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Total Nodes:</span>
            <span className="info-value">3</span>
          </div>
          <div className="info-item">
            <span className="info-label">Active Nodes:</span>
            <span className="info-value">
              {(avrData.Node === 1 ? 1 : 0) + (avrData.Node1 === 1 ? 1 : 0) + (avrData.Node2 === 1 ? 1 : 0)}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Connection Status:</span>
            <span className="info-value connected">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Avr;