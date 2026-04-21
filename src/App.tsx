import React, { useState } from 'react';
import BlackHoleSimulation from './components/BlackHoleSimulation';
import './App.css'; 

function App() {
  const [cameraY, setCameraY] = useState(0.15);
  const [speed, setSpeed] = useState(1.0);
  const [showDisk, setShowDisk] = useState(true);
  const [showCalibration, setShowCalibration] = useState(false); 

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    backgroundColor: 'rgba(20, 20, 30, 0.8)',
    padding: '20px',
    borderRadius: '12px',
    color: 'white',
    fontFamily: 'sans-serif',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    zIndex: 10,
    width: '300px'
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 'bold'
  };

  return (
    <div style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
      
      {/* Control Panel Overlay */}
      <div style={panelStyle}>
        <h2 style={{ marginTop: 0, fontSize: '18px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
          Physics Parameters
        </h2>

        {/* Camera Tilt Slider */}
        <div style={{ marginBottom: '10px' }}>
          <div style={labelStyle}>
            <span>Camera Elevation</span>
            <span>{cameraY.toFixed(2)}</span>
          </div>
          <input 
            type="range" 
            min="-3.0" 
            max="3.0" 
            step="0.05" 
            value={cameraY} 
            onChange={(e) => setCameraY(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Animation Speed Slider */}
        <div style={{ marginBottom: '20px' }}>
          <div style={labelStyle}>
            <span>Time Dilation (Speed)</span>
            <span>{speed.toFixed(1)}x</span>
          </div>
          <input 
            type="range" 
            min="0.0" 
            max="3.0" 
            step="0.1" 
            value={speed} 
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Accretion Disk Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={labelStyle}>Accretion Disk Matter</span>
          <input 
            type="checkbox" 
            checked={showDisk}
            onChange={(e) => setShowDisk(e.target.checked)}
            style={{ transform: 'scale(1.2)' }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={labelStyle}>Show Shadow Ring</span>
          <input 
            type="checkbox" 
            checked={showCalibration}
            onChange={(e) => setShowCalibration(e.target.checked)}
            style={{ transform: 'scale(1.2)' }}
          />
        </div>
      </div>
      

      {/* The Simulation Canvas */}
      <BlackHoleSimulation 
        cameraY={cameraY} 
        speed={speed} 
        showDisk={showDisk} 
        showCalibration={showCalibration}
      />
      
    </div>
  );
}

export default App;
