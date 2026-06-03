/** Extrae el ID de video de URLs de YouTube (watch, shorts, embed, youtu.be). */
export function parseYoutubeVideoId(url) {
  if (!url || typeof url !== "string") return null;
  const s = url.trim();
  const patterns = [
    /(?:youtube\.com\/shorts\/)([\w-]{11})/i,
    /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/i,
    /(?:youtu\.be\/)([\w-]{11})/i,
    /(?:youtube\.com\/embed\/)([\w-]{11})/i,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function youtubeEmbedUrl(videoId, { autoplay = true } = {}) {
  if (!videoId) return "";
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    mute: "1",
    controls: "0",
    loop: "1",
    playlist: videoId,
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    showinfo: "0",
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
