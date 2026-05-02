import React, { useState, useEffect } from 'react';
import { subscribeToLiveUpdates } from '../services/firebase';
import './Projector.css';

const Projector = () => {
  const [liveState, setLiveState] = useState({
    type: 'CLEAR',
    title: '',
    content: '',
    slideIndex: 0,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    logoUrl: null
  });

  useEffect(() => {
    const unsubscribe = subscribeToLiveUpdates((message) => {
      setLiveState(message);
    });
    return () => unsubscribe();
  }, []);

  const getSlideContent = () => {
    if (liveState.type === 'BLACK') return null;
    if (liveState.type === 'LOGO') {
      return (
        <div className="logo-display">
          {liveState.logoUrl ? (
            <img src={liveState.logoUrl} alt="Church Logo" className="live-logo" />
          ) : (
            "CHURCH LOGO"
          )}
        </div>
      );
    }
    if (liveState.type === 'CLEAR') return null;
    
    const slides = liveState.content.split('\n\n');
    return slides[liveState.slideIndex] || "";
  };

  return (
    <div 
      className={`projector-screen ${liveState.type.toLowerCase()}`}
      style={{ 
        background: liveState.background || 'var(--bg-darker)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="background-overlay"></div>
      
      <div className="slide-container animate-fade-in" key={`${liveState.title}-${liveState.slideIndex}`}>
        {getSlideContent()}
      </div>
    </div>
  );
};

export default Projector;
