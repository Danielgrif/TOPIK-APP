import { state } from "../core/state.ts";
import type { Word } from "../types/index.ts";

/**
 * Prefetches audio for upcoming words in the filtered data.
 * This is called proactively during scroll to preload audio assets.
 */
export function prefetchNextAudio(data: Word[], startIndex: number, count: number = 3) {
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    if (idx < data.length) {
      const item = data[idx];
      let url = item.audio_url;
      if (state.currentVoice === "male" && item.audio_male) url = item.audio_male;

      if (url) {
        const audio = new Audio();
        audio.src = url;
        audio.preload = "metadata";
      }
    }
  }
}

/**
 * Prefetches images for upcoming words in the filtered data.
 * This is called proactively during scroll to preload image assets.
 */
export function prefetchNextImages(data: Word[], startIndex: number, count: number = 5) {
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    if (idx < data.length) {
      const item = data[idx];
      if (item.image) {
        const img = new Image();
        img.src = item.image;
      }
    }
  }
}
