import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CatalogPage from './components/CatalogPage';
import SubtitleEditor from './components/SubtitleEditor';
import RecordingPage from './components/RecordingPage';
import MixingPage from './components/MixingPage';
import ScrollToTop from './components/shared/ScrollToTop';
import './App.css';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="App">
        <Routes>
          <Route path="/"                  element={<CatalogPage />} />
          <Route path="/subtitle/:videoId" element={<SubtitleEditor />} />
          <Route path="/record/:videoId"   element={<RecordingPage />} />
          <Route path="/mix/:videoId"      element={<MixingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
