import { describe, it, expect } from 'vitest';
import type { ProjectConfig } from './types';

describe('Project Types', () => {
  it('should validate a basic project structure', () => {
    const proj: ProjectConfig = {
      titulo: 'Test',
      configuracoes_globais: {
        resolucao: '1920x1080',
        fps: 30,
        formato_saida: 'mp4',
        audio: {
          sample_rate: 48000,
          bitrate: '320k',
          canais: 2,
          codec: 'aac',
          normalizar_volume: true
        }
      },
      trilha_sonora: {
        arquivo: 'test.mp3',
        volume: 0.5,
        loop: true
      },
      cenas: []
    };
    
    expect(proj.titulo).toBe('Test');
    expect(proj.cenas.length).toBe(0);
  });
});
