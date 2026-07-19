import Button from '../../../shared/Button/Button';

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

export function SubtitleAiDescriptionPanel({handleGenerate, isGenerating, autoTranslate, handleAutoTranslate, targetLang, handleTargetLang}) {

    return (
        <div className="subtitle-ai-description-panel">
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
              onChange={handleAutoTranslate}
              disabled={isGenerating}
            />
            Traduzir automaticamente após gerar
          </label>
          {autoTranslate && (
            <select
              value={targetLang}
              onChange={handleTargetLang}
              disabled={isGenerating}
              className="subtitle-lang-select"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          )}
        </div>
    );
}