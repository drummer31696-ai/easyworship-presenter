import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Controller from './components/Controller';
import Projector from './components/Projector';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Controller />} />
        <Route path="/projector" element={<Projector />} />
      </Routes>
    </Router>
  );
}

export default App;
