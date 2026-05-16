import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mixAudio } from '../services/api';
import { getRecordedAudio } from '../store/recordingStore';
import SubtitleSourceSelector from './SubtitleSourceSelector';
import Button from './shared/Button';

const subtitlesStorageKey = (id) => `dublee-subtitles-${id}`;

const MixingPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [voiceVolume, setVoiceVolume] = useState(100);
  const [effectsVolume, setEffectsVolume] = useState(100);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [subtitles, setSubtitles] = useState(() => {
    try {
      const saved = localStorage.getItem(subtitlesStorageKey(videoId));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const subtitlesRef = useRef(subtitles);
  const [currentSubtitleText, setCurrentSubtitleText] = useState('');

  useEffect(() => { subtitlesRef.current = subtitles; }, [subtitles]);

  // Track last mixed params to avoid regenerating on download when nothing changed
  const lastMixRef = useRef(null); // { voiceVolume, effectsVolume, url, blob }

  useEffect(() => {
    if (!getRecordedAudio()) {
      setStatus({ type: 'error', message: 'Nenhuma gravação encontrada. Volte e grave novamente.' });
    }
    return () => {
      if (lastMixRef.current?.url) URL.revokeObjectURL(lastMixRef.current.url);
    };
  }, []);

  const getMix = async () => {
    const audioBlob = getRecordedAudio();
    if (!audioBlob) throw new Error('Áudio gravado não encontrado.');

    // Reuse last mix if volumes haven't changed
    if (
      lastMixRef.current &&
      lastMixRef.current.voiceVolume === voiceVolume &&
      lastMixRef.current.effectsVolume === effectsVolume
    ) {
      return lastMixRef.current;
    }

    const videoBlob = await mixAudio(videoId, audioBlob, voiceVolume / 100, effectsVolume / 100);
    const url = URL.createObjectURL(videoBlob);

    if (lastMixRef.current?.url) URL.revokeObjectURL(lastMixRef.current.url);
    lastMixRef.current = { voiceVolume, effectsVolume, url, blob: videoBlob };
    return lastMixRef.current;
  };

  const handlePreview = async () => {
    setIsProcessing(true);
    setStatus({ type: 'loading', message: 'Gerando pré-visualização...' });
    try {
      const mix = await getMix();
      setPreviewUrl(mix.url);
      setStatus({ type: 'success', message: 'Pré-visualização pronta. Ajuste os volumes e pré-visualize novamente se necessário.' });
      setTimeout(() => videoRef.current?.play(), 100);
    } catch (error) {
      setStatus({ type: 'error', message: 'Erro ao gerar prévia: ' + error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    setStatus({ type: 'loading', message: 'Preparando download...' });
    try {
      const mix = await getMix();
      const link = document.createElement('a');
      link.href = mix.url;
      link.download = `video-redublado-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatus({ type: 'success', message: '✅ Download iniciado!' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Erro ao baixar: ' + error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🎬 Redublador de Vídeos</h1>
        <p>Ajuste os volumes antes de baixar o vídeo final</p>
      </div>

      <div className="content">
        <div className="section">
          <h2>
            <span className="section-number">4</span>
            Mixagem de Áudio
          </h2>

          <SubtitleSourceSelector
            videoId={videoId}
            onSubtitlesLoaded={(subs) => setSubtitles(subs)}
          />

          {/* Volume sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
            <VolumeSlider
              label="🎙 Voz gravada"
              value={voiceVolume}
              onChange={setVoiceVolume}
              disabled={isProcessing}
            />
            <VolumeSlider
              label="🎵 Efeitos sonoros"
              value={effectsVolume}
              onChange={setEffectsVolume}
              disabled={isProcessing}
            />
          </div>

          {/* Preview button */}
          <Button
            variant="primary"
            style={{ width: '100%' }}
            onClick={handlePreview}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processando...' : '▶ Pré-visualizar mixagem'}
          </Button>

          {/* Preview player */}
          {previewUrl && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Pré-visualização:</p>
              <div style={{ position: 'relative' }}>
                <video
                  ref={videoRef}
                  src={previewUrl}
                  controls
                  style={{ marginBottom: 0 }}
                  onTimeUpdate={(e) => {
                    const t = e.target.currentTime;
                    const found = subtitlesRef.current.find(s => t >= s.startTime && t <= s.endTime);
                    setCurrentSubtitleText(found?.text ?? '');
                  }}
                />
                {currentSubtitleText && (
                  <div style={{
                    position: 'absolute', bottom: '52px', left: '50%',
                    transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.78)',
                    color: '#fff', padding: '5px 16px', borderRadius: '4px',
                    fontSize: '18px', maxWidth: '90%', textAlign: 'center',
                    pointerEvents: 'none', whiteSpace: 'pre-wrap',
                  }}>
                    {currentSubtitleText}
                  </div>
                )}
              </div>
            </div>
          )}

          {status.message && (
            <div className={`status-message show ${status.type}`} style={{ marginTop: '16px' }}>
              {status.type === 'loading' && <span className="spinner"></span>}
              {status.message}
            </div>
          )}

          {/* Action buttons */}
          <div className="button-group" style={{ marginTop: '24px' }}>
            <Button
              variant="danger"
              onClick={handleDownload}
              disabled={isProcessing}
              style={{ flex: 1 }}
            >
              ⬇ Baixar Vídeo
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(`/record/${videoId}`)}
              disabled={isProcessing}
            >
              Regravar Voz
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const VolumeSlider = ({ label, value, onChange, disabled }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
      <span style={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '14px', color: '#667eea', fontWeight: 600 }}>{value}%</span>
    </div>
    <input
      type="range"
      min={0}
      max={200}
      step={5}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      disabled={disabled}
      style={{ width: '100%', accentColor: '#667eea', cursor: disabled ? 'not-allowed' : 'pointer' }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
      <span>0%</span>
      <span>100%</span>
      <span>200%</span>
    </div>
  </div>
);

export default MixingPage;
