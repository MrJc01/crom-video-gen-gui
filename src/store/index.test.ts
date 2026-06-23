import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './index';
import type { Scene } from '../types';

describe('Editor Store', () => {
  beforeEach(() => {
    // Reset store
    useEditorStore.setState({
      project: {
        titulo: "Test",
        configuracoes_globais: {
          resolucao: "1920x1080",
          fps: 30,
          formato_saida: "mp4",
          audio: { sample_rate: 48000, bitrate: "320k", canais: 2, codec: "aac", normalizar_volume: true }
        },
        trilha_sonora: { arquivo: "", volume: 0.1, loop: true },
        cenas: []
      },
      selectedSceneId: null
    });
  });

  it('should add a scene and auto-select it', () => {
    const mockScene: Scene = {
      id: 0,
      template: { id: 'intro_branding', parametros: {} },
      ativos: {},
      narracao: { texto: 'Hello', voz: 'test' }
    };

    useEditorStore.getState().addScene(mockScene);
    const state = useEditorStore.getState();
    
    expect(state.project.cenas.length).toBe(1);
    expect(state.project.cenas[0].id).toBe(1); // Auto incremented ID
    expect(state.selectedSceneId).toBe(1);
  });

  it('should remove a scene', () => {
    const mockScene: Scene = { id: 0, template: { id: 'intro', parametros: {} }, ativos: {}, narracao: { texto: '', voz: '' } };
    useEditorStore.getState().addScene(mockScene);
    
    const state = useEditorStore.getState();
    const sceneId = state.project.cenas[0].id;
    
    useEditorStore.getState().removeScene(sceneId);
    expect(useEditorStore.getState().project.cenas.length).toBe(0);
  });
});
