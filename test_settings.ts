import { duckBackgroundMusic } from "./src/ui/ui_settings"; import { state } from "./src/core/state";

export async function runSettingsTests(
  assert: (desc: string, condition: boolean) => void
) {
  console.log("📘 Settings Logic");

  // Mock document.getElementById for audio players
  const mockPlayer = { 
    volume: 0.5, 
    style: {}, 
    pause: () => {}, 
    play: () => Promise.resolve() 
  } as unknown as HTMLAudioElement;
  
  const originalGetElementById = document.getElementById;
  
  // @ts-ignore
  document.getElementById = (id: string) => {
    if (id === "music-player-a" || id === "music-player-b") return mockPlayer;
    return originalGetElementById.call(document, id);
  };

  // Test duckBackgroundMusic
  const originalEnabled = state.backgroundMusicEnabled;
  const originalVolume = state.backgroundMusicVolume;
  
  state.backgroundMusicEnabled = true;
  state.backgroundMusicVolume = 0.5;
  mockPlayer.volume = 0.5;
  
  // Test: Lower volume
  duckBackgroundMusic(true);
  // 0.5 * 0.2 = 0.1
  assert("duckBackgroundMusic(true) lowers volume", Math.abs(mockPlayer.volume - 0.1) < 0.001);

  // Test: Restore volume
  duckBackgroundMusic(false);
  assert("duckBackgroundMusic(false) restores volume", Math.abs(mockPlayer.volume - 0.5) < 0.001);

  // Restore original state
  state.backgroundMusicEnabled = originalEnabled;
  state.backgroundMusicVolume = originalVolume;
  document.getElementById = originalGetElementById;
}
