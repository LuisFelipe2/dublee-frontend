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
        <div className="subtitle-ai-toolbar">
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '⏳ Gerando…' : '✨ Gerar legendas com IA'}
          </Button>
          <label className="subtitle-translate-check">
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={handleAutoTranslate}
              disabled={isGenerating}
            />
            Traduzir automaticamente
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
