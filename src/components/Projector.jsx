import React, { useState, useEffect } from 'react';
import { subscribeToLiveUpdates } from '../services/firebase';
import './Projector.css';

const Projector = () => {
  const [liveState, setLiveState] = useState({
    type: 'CLEAR',
    title: '',
    content: '',
    slideIndex: 0
  });

  useEffect(() => {
    const unsubscribe = subscribeToLiveUpdates((message) => {
      setLiveState(message);
    });
    return () => unsubscribe();
  }, []);

  const getSlideContent = () => {
    if (liveState.type === 'BLACK') return null;
    if (liveState.type === 'LOGO') return <div className="logo-display">CHURCH LOGO</div>;
    if (liveState.type === 'CLEAR') return null;
    
    const slides = liveState.content.split('\n\n');
    return slides[liveState.slideIndex] || "";
  };

  return (
    <div className={`projector-screen ${liveState.type.toLowerCase()}`}>
      <div className="background-overlay"></div>
      
      <div className="slide-container animate-fade-in" key={`${liveState.title}-${liveState.slideIndex}`}>
        {getSlideContent()}
      </div>
    </div>
  );
};

export default Projector;
