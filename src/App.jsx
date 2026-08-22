import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CatalogPage from './components/pages/CatalogPage/CatalogPage';
import SubtitleEditor from './components/pages/SubtitleEditor/SubtitleEditor';
import EditorPage from './components/pages/EditorPage/EditorPage';
import FaqPage from './components/pages/FaqPage/FaqPage';
import ScrollToTop from './components/shared/ScrollToTop/ScrollToTop';
import './App.css';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="App">
        <Routes>
          <Route path="/"                  element={<CatalogPage />} />
          <Route path="/subtitle/:videoId" element={<SubtitleEditor />} />
          <Route path="/record/:videoId"   element={<EditorPage />} />
          <Route path="/faq"               element={<FaqPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
