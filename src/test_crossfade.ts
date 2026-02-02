import { crossfade } from "./ui/ui_settings.ts";

export async function runCrossfadeTests(
  assert: (desc: string, condition: boolean) => void,
  assertRange: (desc: string, actual: number, min: number, max: number) => void,
) {
  // eslint-disable-next-line no-console
  console.log("📘 Crossfade Logic");

  // Простой Mock для HTMLAudioElement
  class MockAudio {
    volume: number;
    constructor(vol: number) {
      this.volume = vol;
    }
    pause() {}
    play() {
      return Promise.resolve();
    }
  }

  await new Promise<void>((resolve) => {
    const fadeIn = new MockAudio(0.2) as unknown as HTMLAudioElement;
    const fadeOut = new MockAudio(0.8) as unknown as HTMLAudioElement;
    const targetVol = 0.8;

    // Запускаем кроссфейд (длительность ~1000мс)
    crossfade(fadeIn, fadeOut, targetVol);

    // Проверяем промежуточные значения через 500мс
    setTimeout(() => {
      // FadeIn должен быть на полпути к целевой громкости (0.2 -> 0.8, середина 0.5)
      assertRange(
        "Crossfade midpoint (FadeIn volume)",
        fadeIn.volume,
        0.45,
        0.55,
      );
      // FadeOut должен быть на полпути к 0 (0.8 -> 0, середина 0.4)
      assertRange(
        "Crossfade midpoint (FadeOut volume)",
        fadeOut.volume,
        0.35,
        0.45,
      );
    }, 500);

    // Проверяем через 1100мс (с запасом), так как setInterval в crossfade работает асинхронно
    setTimeout(() => {
      // FadeIn должен достичь целевой громкости
      assert(
        "Crossfade finished (FadeIn target reached)",
        Math.abs(fadeIn.volume - targetVol) < 0.01,
      );
      // FadeOut должен уйти в 0
      assert("Crossfade finished (FadeOut silenced)", fadeOut.volume === 0);
      resolve();
    }, 1100);
  });
}
