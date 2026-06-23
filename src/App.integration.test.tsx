import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { useEditorStore } from './store';

describe('App Integration', () => {
  beforeEach(() => {
    // Reset Zustand state before each test
    useEditorStore.setState({
      project: {
        titulo: "Test Project",
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

  it('renders the sidebar, canvas, timeline and panel', () => {
    render(<App />);
    
    // Check Sidebar (Crom logo placeholder)
    expect(screen.getByText('🎬')).toBeInTheDocument();
    
    // Check Canvas placeholder when no scenes
    expect(screen.getByText('Selecione ou crie uma cena para ver o preview')).toBeInTheDocument();
    
    // Check Properties Panel empty state
    expect(screen.getByText('Selecione uma cena para editar suas propriedades')).toBeInTheDocument();
    
    // Check Timeline add button
    expect(screen.getByText('Nova Cena')).toBeInTheDocument();
  });

  it('adds a scene and displays properties', () => {
    render(<App />);
    
    // Click Add Scene
    const addButton = screen.getByText('Nova Cena');
    fireEvent.click(addButton);
    
    // The store should now have 1 scene, which is auto-selected
    const state = useEditorStore.getState();
    expect(state.project.cenas.length).toBe(1);
    expect(state.selectedSceneId).toBe(1);
    
    // Properties panel should show Scene Properties title (Cena selecionada)
    expect(screen.getByText('Cena selecionada')).toBeInTheDocument();
    // It should render the intro_branding title
    expect(screen.getAllByText('intro branding').length).toBeGreaterThan(0);
    
    // Canvas should reflect the new scene text
    expect(screen.getAllByText('Nova Cena').length).toBeGreaterThan(0);
  });
});
