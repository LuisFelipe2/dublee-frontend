import { downloadVideo } from './api';

const cache = new Map();

export const downloadVideoCached = async (videoId) => {
  if (cache.has(videoId)) {
    return [cache.get(videoId), true];
  }
  const [blob, success] = await downloadVideo(videoId);
  if (success) cache.set(videoId, blob);
  return [blob, success];
};
