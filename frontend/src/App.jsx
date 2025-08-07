import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Checklist from './components/Checklist';
import Summary from './components/Summary';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-neumo-bg">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/summary/:responseId" element={<Summary />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;