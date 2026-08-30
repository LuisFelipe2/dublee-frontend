import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CatalogPage from './components/pages/CatalogPage/CatalogPage';
import SubtitleEditor from './components/pages/SubtitleEditor/SubtitleEditor';
import EditorPage from './components/pages/EditorPage/EditorPage';
import AboutPage from './components/pages/Info/AboutPage';
import CopyrightPage from './components/pages/Info/CopyrightPage';
import TermsPrivacyPage from './components/pages/Info/TermsPrivacyPage';
import HowItWorksPage from './components/pages/Info/HowItWorksPage';
import NewsPage from './components/pages/Info/NewsPage';
import CareersPage from './components/pages/Info/CareersPage';
import ScrollToTop from './components/shared/ScrollToTop/ScrollToTop';
import './App.css';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="App">
        <Routes>
          <Route path="/"                     element={<CatalogPage />} />
          <Route path="/subtitle/:videoId"    element={<SubtitleEditor />} />
          <Route path="/record/:videoId"      element={<EditorPage />} />
          <Route path="/direitos-autorais"    element={<CopyrightPage />} />
          <Route path="/sobre"                element={<AboutPage />} />
          <Route path="/termos-privacidade"   element={<TermsPrivacyPage />} />
          <Route path="/como-funciona"        element={<HowItWorksPage />} />
          <Route path="/novidades"            element={<NewsPage />} />
          <Route path="/trabalhe-conosco"     element={<CareersPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
