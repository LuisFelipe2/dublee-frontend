import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { SubtitleManualDescriptionPanel } from './Panel/SubtitleManualDescriptionPanel';
import { SubtitleAiDescriptionPanel } from './Panel/SubtitleAiDescriptionPanel';
import { showToastError, handleToastLoading }  from '../../../utils/utils';

const storageKey = (id) => `dublee-subtitles-${id}`;

const SubtitleEditor = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();

  const [blobUrl, setBlobUrl] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [subtitles, setSubtitles] = useState([]);
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
      handleToastLoading(showToast, setIsVideoLoading, 'Baixando vídeo…');

      const [blob, success] = await downloadVideo(videoId);

      if (!success) showToastError(showToast, setIsVideoLoading, 'Erro ao baixar vídeo. Tente novamente ou comunique o suporte.');

      setBlobUrl(URL.createObjectURL(blob));

      const saved = localStorage.getItem(storageKey(videoId));
      setSubtitles(saved ? JSON.parse(saved) : []);
      setIsVideoLoading(false);
      setToast(null);
    }

    fetchVideo();
  }, [videoId]);

  const handleGenerate = async () => {
    handleToastLoading(showToast, setIsGenerating, 'Transcrevendo com IA… pode levar alguns instantes');

    const [result, success] = await transcribeWithWhisper(videoId)
    if (!success) return showToastError(showToast, setIsGenerating, 'Falha ao transcrever vídeo');

    if (autoTranslate) await handleTranslateGenerate(result.subtitles);
    else setSubtitles(result.subtitles);

    showToast('success', 'Legendas geradas com sucesso!');
    setIsGenerating(false);
  };

  const handleTranslateGenerate = async (subs) => {
    if (subs.length > 0) {
      handleToastLoading(showToast, setIsGenerating, 'Traduzindo legendas…');
      const [translated, success] = await translateSubtitles(videoId, subs, targetLang);

      if (!success) return showToastError(showToast, setIsGenerating, 'Falha ao traduzir legendas');

      setSubtitles(translated.subtitles);
    }
  };

  const onAutoTranslateChange = (e) => {
    setAutoTranslate(e.target.checked);
  };

  const onTargetLangChange = (e) => {
    setTargetLang(e.target.value);
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
              <VideoPlayer
                src={blobUrl}
                subtitles={subtitles}
                showFsButton
                isVideoLoading={isVideoLoading}
              />
            </div>

            {/* ── Seção 2: Métodos ── */}
            <div className="section">
              <SplitLayout
                variant="bordered"
                left={
                  <SubtitleManualDescriptionPanel />
                }
                right={
                  <SubtitleAiDescriptionPanel
                    handleGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    autoTranslate={autoTranslate}
                    handleAutoTranslate={onAutoTranslateChange}
                    targetLang={targetLang}
                    handleTargetLang={onTargetLangChange}
                  />
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
