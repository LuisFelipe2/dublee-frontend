import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadPage from './components/UploadPage';
import RecordingPage from './components/RecordingPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/record/:videoId" element={<RecordingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;