export function SubtitleManualDescriptionPanel() {

    return (
        <div className="subtitle-manual-description-panel">
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
        </div>
    );
}