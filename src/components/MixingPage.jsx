import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mixAudio } from '../services/api';
import { getRecordedAudio } from '../store/recordingStore';
import Header from './shared/Header';
import Footer from './shared/Footer';
import PageHeader from './shared/PageHeader';
import VideoPlayer from './shared/VideoPlayer';
import Button from './shared/Button';
import Toast from './shared/Toast';
import './MixingPage.css';

const subtitlesStorageKey = (id) => `dublee-subtitles-${id}`;

const MixingPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [voiceVolume, setVoiceVolume] = useState(100);
  const [effectsVolume, setEffectsVolume] = useState(100);
  const [toast, setToast] = useState(null);
  const showToast = (type, message) => setToast({ type, message, id: Date.now() });
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [lastMixedVolumes, setLastMixedVolumes] = useState(null);

  const [subtitles] = useState(() => {
    try {
      const saved = localStorage.getItem(subtitlesStorageKey(videoId));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const lastMixRef = useRef(null);

  const hasUnsavedChanges = lastMixedVolumes === null
    || lastMixedVolumes.voice !== voiceVolume
    || lastMixedVolumes.effects !== effectsVolume;

  const showOverlay = isProcessing || (lastMixedVolumes !== null && hasUnsavedChanges);

  useEffect(() => {
    if (!getRecordedAudio()) {
      showToast('error', 'Nenhuma gravação encontrada. Volte e grave novamente.');
      return;
    }
    handleReload();
    return () => {
      if (lastMixRef.current?.url) URL.revokeObjectURL(lastMixRef.current.url);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMix = async () => {
    const audioBlob = getRecordedAudio();
    if (!audioBlob) throw new Error('Áudio gravado não encontrado.');

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

  const handleReload = async () => {
    setIsProcessing(true);
    try {
      const mix = await getMix();
      setPreviewUrl(mix.url);
      setLastMixedVolumes({ voice: voiceVolume, effects: effectsVolume });
      setTimeout(() => videoRef.current?.play(), 100);
    } catch (error) {
      showToast('error', 'Erro ao gerar mixagem: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    showToast('loading', 'Preparando download...');
    try {
      const mix = await getMix();
      const link = document.createElement('a');
      link.href = mix.url;
      link.download = `video-redublado-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('success', 'Download iniciado!');
    } catch (error) {
      showToast('error', 'Erro ao baixar: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Header />

      <main className="page-main">
        <div className="container">

          <PageHeader
            title="Mixagem Final"
            subtitle="Passo 4 de 4"
            description="Ajuste os volumes da sua voz e do áudio de fundo, pré-visualize o resultado
              e baixe o vídeo dublado em alta qualidade."
          />

          <div className="content">
            <div className="section">

              <div className="mix-player-wrapper">
                <VideoPlayer
                  ref={videoRef}
                  src={previewUrl}
                  showFsButton
                  showChrono={false}
                />
                {showOverlay && (
                  <div className="mix-overlay">
                    <div className="mix-overlay__card">
                      {isProcessing ? (
                        <>
                          <span className="mix-overlay__icon mix-overlay__icon--spin">⏳</span>
                          <p className="mix-overlay__text">
                            {previewUrl === null ? 'Preparando vídeo…' : 'Atualizando mixagem…'}
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="mix-overlay__icon">⚠️</span>
                          <p className="mix-overlay__text">
                            As configurações de áudio foram alteradas.
                            Recarregue o vídeo para aplicar as mudanças.
                          </p>
                          <Button variant="primary" onClick={handleReload}>
                            ↺ Recarregar Vídeo
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mix-sliders">
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

              <div className="button-group mix-actions">
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/record/${videoId}`)}
                  disabled={isProcessing}
                >
                  Regravar Voz
                </Button>
                <Button
                  variant="advance"
                  onClick={handleDownload}
                  disabled={isProcessing || !previewUrl}
                  style={{ marginLeft: 'auto' }}
                >
                  ⬇ Baixar Vídeo
                </Button>
              </div>

            </div>
          </div>

        </div>
      </main>

      <Footer />

      {toast && (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

const VolumeSlider = ({ label, value, onChange, disabled }) => (
  <div className="mix-slider">
    <div className="mix-slider__header">
      <span className="mix-slider__label">{label}</span>
      <span className="mix-slider__value">{value}%</span>
    </div>
    <input
      type="range"
      min={0}
      max={200}
      step={5}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      disabled={disabled}
      className="mix-slider__input"
    />
    <div className="mix-slider__scale">
      <span>0%</span>
      <span>100%</span>
      <span>200%</span>
    </div>
  </div>
);

export default MixingPage;
