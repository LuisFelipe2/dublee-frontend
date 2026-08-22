import { useState, useEffect } from 'react';

const CAPTION_SIZE_STORAGE_KEY = 'dublee-caption-size';

// Preferência de tamanho de legenda/cronômetro é global (não por vídeo/tela)
// e persiste entre visitas — compartilhada entre a tela de legendagem
// (onde o usuário escolhe o tamanho, via SubtitleSettingsModal) e a tela de
// gravação (que só lê a preferência, sem controle próprio pra mudá-la).
export const useCaptionSize = () => {
  const [captionSize, setCaptionSize] = useState(
    () => localStorage.getItem(CAPTION_SIZE_STORAGE_KEY) || 'md'
  );

  useEffect(() => {
    localStorage.setItem(CAPTION_SIZE_STORAGE_KEY, captionSize);
  }, [captionSize]);

  return [captionSize, setCaptionSize];
};

export default useCaptionSize;
