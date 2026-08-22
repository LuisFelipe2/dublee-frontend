// Legenda/cronômetro renderizados como overlay próprio (nunca <track>/VTTCue
// nativo — alguns navegadores/SOs sobrescrevem ::cue com a preferência de
// legenda do sistema, ignorando o CSS da página). Tamanho vem 100% do nosso
// próprio state, garantindo que o controle funcione em qualquer aparelho.
// Compartilhado entre a tela de legendagem (SubtitleEditor) e a de gravação
// (EditorPageMobile) — as duas usam a MESMA preferência (ver useCaptionSize)
// e a mesma escala, pra legenda e cronômetro ficarem consistentes nos dois
// lugares.
export const CAPTION_FONT_SIZE = { sm: 13, md: 18, lg: 26 };

// Usado sempre que a legenda/cronômetro aparece sobre o vídeo em modo
// imersivo — tela cheia (real ou forçada em tier X) na tela de legendagem,
// ou a tela de gravação inteira (que é sempre full-bleed, ver EditorPage.jsx).
export const CAPTION_FONT_SIZE_IMMERSIVE = { sm: 22, md: 32, lg: 40 };

// Multiplicador por tier de tela (mesmos limiares de useBreakpoint/breakpoints.js):
// P (celular) reduz pra caber na tela pequena; X (TV, ≥1920px) aumenta bastante
// pra ficar legível a distância — M/G ficam no tamanho "de referência" (1x).
export const CAPTION_SIZE_MULTIPLIER = { P: 0.72, M: 1, G: 1, X: 1.7 };
