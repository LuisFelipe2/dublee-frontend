import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { downloadVideo, translateSubtitles, transcribeWithWhisper } from '../../../services/api';
import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import VideoPlayer from '../../shared/VideoPlayer/VideoPlayer';
import Button from '../../shared/Button/Button';
import SplitLayout from '../../shared/SplitLayout/SplitLayout';
import PageHeader from '../../shared/PageHeader/PageHeader';
import Toast from '../../shared/Toast/Toast';
import SubtitleTable from '../../shared/SubtitleTable/SubtitleTable';
import './SubtitleEditor.css';

const LANGUAGES = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'Inglês' },
  { code: 'es', label: 'Espanhol' },
  { code: 'fr', label: 'Francês' },
  { code: 'de', label: 'Alemão' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: 'Japonês' },
  { code: 'ko', label: 'Coreano' },
  { code: 'zh-CN', label: 'Chinês (simplificado)' },
  { code: 'ru', label: 'Russo' },
];

const storageKey = (id) => `dublee-subtitles-${id}`;

const SubtitleEditor = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromCatalog = searchParams.get('from') === 'catalog';

  const [blobUrl, setBlobUrl] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const [subtitles, setSubtitles] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey(videoId));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState(null);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [targetLang, setTargetLang] = useState('pt');
  const showToast = (type, message) => setToast({ type, message, id: Date.now() });

  useEffect(() => {
    localStorage.setItem(storageKey(videoId), JSON.stringify(subtitles));
  }, [subtitles, videoId]);

  useEffect(() => {
    
    async function fetchVideo() {
      const [blob, success] = await downloadVideo(videoId);

      if (!success) {
        showToast('error', 'Erro ao baixar vídeo. Tente novamente ou comunique o suporte.');
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
    }

    fetchVideo();
    setIsVideoLoading(false);
  }, [videoId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    showToast('loading', 'Transcrevendo com IA… pode levar alguns instantes');
    try {
      const result = await transcribeWithWhisper(videoId);
      let subs = result.subtitles ?? [];
      if (autoTranslate && subs.length > 0) {
        showToast('loading', 'Traduzindo legendas…');
        const translated = await translateSubtitles(videoId, subs, targetLang);
        subs = translated.subtitles ?? subs;
      }
      setSubtitles(subs);
      showToast('success', `${subs.length} legenda${subs.length !== 1 ? 's' : ''} gerada${subs.length !== 1 ? 's' : ''}`);
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Header />

      <main className="page-main">
        <div className="container">

          <PageHeader
            title="Vamos colocar legendas!"
            subtitle="Passo 1 de 2"
            description="Primeiro adicione legendas para auxíliar na hora de dublar. Você pode fazer isso
              consultando o cronômetro do vídeo e preenchendo na tabela abaixo a legenda e o tempo de início e fim de cada fala."
          />

          <div className="content">

            {/* ── Seção 1: Vídeo ── */}
            <div className="section">
              {isVideoLoading ? (
                <div className="video-loading-placeholder">
                  ⏳ Carregando vídeo…
                </div>
              ) : (
                <VideoPlayer
                  src={blobUrl}
                  subtitles={subtitles}
                  showFsButton
                />
              )}
            </div>

            {/* ── Seção 2: Métodos ── */}
            <div className="section">
              <SplitLayout
                variant="bordered"
                left={
                  <>
                    <h3 className="subtitle-method-panel__title">
                      <span>✍️</span> Manual
                    </h3>
                    <p className="subtitle-method-panel__desc">
                      Adicione legendas consultando o cronômetro do vídeo e preenchendo a tabela abaixo:
                    </p>
                    <ol className="subtitle-method-steps">
                      <li>Reproduza o vídeo e anote os tempos em que o personagem começa e termina a fala pelo <strong>cronômetro</strong></li>
                      <li>Clique em <strong>+</strong> na tabela para adicionar uma linha</li>
                      <li>Na coluna <strong>Início</strong> digite o tempo em que o personagem começa a fala (ex: <code>0:05</code>)</li>
                      <li>Na coluna <strong>Legenda</strong> escreva o texto que lhe guiará durante a gravação</li>
                      <li>Na coluna <strong>Fim</strong> digite o tempo em que o personagem termina a fala (ex: <code>0:10</code>)</li>
                    </ol>
                  </>
                }
                right={
                  <>
                    <h3 className="subtitle-method-panel__title">
                      <span>🤖</span> IA (Whisper)
                    </h3>
                    <p className="subtitle-method-panel__desc">
                      Gere legendas automaticamente a partir do áudio usando o modelo Whisper.
                      O processo pode levar alguns instantes dependendo da duração do vídeo.
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                    >
                      {isGenerating ? '⏳ Gerando…' : '✨ Gerar legendas'}
                    </Button>
                    <label className="subtitle-translate-check">
                      <input
                        type="checkbox"
                        checked={autoTranslate}
                        onChange={e => setAutoTranslate(e.target.checked)}
                        disabled={isGenerating}
                      />
                      Traduzir automaticamente após gerar
                    </label>
                    {autoTranslate && (
                      <select
                        value={targetLang}
                        onChange={e => setTargetLang(e.target.value)}
                        disabled={isGenerating}
                        className="subtitle-lang-select"
                      >
                        {LANGUAGES.map(l => (
                          <option key={l.code} value={l.code}>{l.label}</option>
                        ))}
                      </select>
                    )}
                  </>
                }
              />
            </div>

            {/* ── Seção 3: Tabela ── */}
            <div className="section">
              <SubtitleTable subtitles={subtitles} setSubtitles={setSubtitles} />
            </div>

            {/* ── Seção 4: Navegação ── */}
            <div className="page-nav page-nav--end">
              <Button variant="ghost" onClick={() => navigate('/')}>
                Voltar
              </Button>
              <Button variant="advance" onClick={() => navigate(`/record/${videoId}`)}>
                Ir para tela de gravação!
              </Button>
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

export default SubtitleEditor;
