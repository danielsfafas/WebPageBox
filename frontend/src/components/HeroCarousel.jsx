import React, { useEffect, useMemo, useState } from "react";
import { parseYoutubeVideoId, youtubeEmbedUrl } from "@/lib/youtube";

const FALLBACK_IMAGE =
  "https://images.pexels.com/photos/6456306/pexels-photo-6456306.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1200&w=1600";

function normalizeSlides(slides) {
  const list = (slides || [])
    .map((s) => ({
      type: s?.type === "youtube" ? "youtube" : "image",
      src: (s?.src || "").trim(),
    }))
    .filter((s) => s.src);
  if (list.length === 0) {
    return [{ type: "image", src: FALLBACK_IMAGE }];
  }
  return list;
}

export default function HeroCarousel({ slides, intervalSec = 6 }) {
  const items = useMemo(() => normalizeSlides(slides), [slides]);
  const [index, setIndex] = useState(0);
  const seconds = Math.max(3, Math.min(60, Number(intervalSec) || 6));

  useEffect(() => {
    setIndex(0);
  }, [items.length, seconds]);

  useEffect(() => {
    if (items.length <= 1) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [items.length, seconds]);

  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="hero-carousel">
      {items.map((slide, i) => {
        const active = i === index;
        const videoId = slide.type === "youtube" ? parseYoutubeVideoId(slide.src) : null;
        return (
          <div
            key={`${slide.type}-${i}-${slide.src.slice(0, 32)}`}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              active ? "opacity-100 z-[1]" : "opacity-0 z-0"
            }`}
            aria-hidden={!active}
          >
            {slide.type === "youtube" && videoId ? (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <iframe
                  title={`Video ${i + 1}`}
                  src={youtubeEmbedUrl(videoId, { autoplay: active })}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-[177.78vh] h-[56.25vw]"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  tabIndex={-1}
                />
              </div>
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${slide.src})` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
