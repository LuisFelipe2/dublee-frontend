// Cronômetro mm:ss:ms, compartilhado entre a tela de legendagem
// (SubtitleEditor) e a de gravação (EditorPageMobile) — as duas mostram um
// cronômetro preciso sobre o vídeo com o mesmo formato.
export const formatChrono = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
};
