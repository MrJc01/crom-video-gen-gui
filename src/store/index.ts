import { create } from 'zustand';
import type { ProjectConfig, Scene, GlobalSettings, Soundtrack } from '../types';

export const estimateSceneDuration = (scene: Scene): number => {
  if (!scene.narracao || !scene.narracao.texto) return 3.0;
  const words = scene.narracao.texto.trim().split(/\s+/).filter(Boolean).length;
  // ~2.5 words per second plus 1.2s padding, min 3.0s
  return Math.max(3.0, Number((words / 2.5 + 1.2).toFixed(1)));
};

interface EditorState {
  project: ProjectConfig;
  selectedSceneId: number | null;
  activeMenu: 'templates' | 'settings' | 'json' | 'gallery' | 'chat' | null;
  isPlaying: boolean;
  currentTime: number;
  activeTemplateSchemas: Record<string, any>;
  isGenerating: boolean;
  generationLogs: string[];
  
  loadProject: (project: ProjectConfig) => void;
  setProjectTitle: (titulo: string) => void;
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void;
  updateSoundtrack: (soundtrack: Partial<Soundtrack>) => void;
  
  selectScene: (id: number | null) => void;
  addScene: (scene: Scene) => void;
  updateScene: (id: number, sceneUpdate: Partial<Scene>) => void;
  duplicateScene: (id: number) => void;
  removeScene: (id: number) => void;
  reorderScenes: (startIndex: number, endIndex: number) => void;
  clearProject: () => void;
  
  toggleMenu: (menu: 'templates' | 'settings' | 'json' | 'gallery' | 'chat') => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  
  fetchSchemas: () => Promise<void>;
  setIsGenerating: (isGenerating: boolean) => void;
  addGenerationLog: (log: string) => void;
  clearGenerationLogs: () => void;
  isRenderModalOpen: boolean;
  setRenderModalOpen: (open: boolean) => void;
  
  openRouterKey: string;
  setOpenRouterKey: (key: string) => void;
  openRouterModel: string;
  setOpenRouterModel: (model: string) => void;
  chatMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  addChatMessage: (msg: { role: 'user' | 'assistant'; content: string }) => void;
  clearChatMessages: () => void;
  isConfigModalOpen: boolean;
  setConfigModalOpen: (open: boolean) => void;
}

const defaultProject: ProjectConfig = {
  titulo: "Demo Video",
  configuracoes_globais: {
    resolucao: "1920x1080",
    fps: 30,
    formato_saida: "mp4",
    audio: {
      sample_rate: 48000,
      bitrate: "320k",
      canais: 2,
      codec: "aac",
      normalizar_volume: true
    }
  },
  trilha_sonora: { arquivo: "", volume: 0.1, loop: true },
  cenas: [
    {
      id: 1,
      template: { id: "intro_branding", parametros: { zoom_speed: 1.1, overlay_opacity: 0.5, text0: "CROM STUDIO" } },
      ativos: { media0: { tipo: "imagem", caminho: "assets/img/capa_projeto.jpg" } },
      narracao: { texto: "Bem-vindo ao Crom Video Studio.", voz: "pt-BR-FranciscaNeural" }
    }
  ]
};

// Helper to save to localStorage
const saveToLocalStorage = (project: ProjectConfig) => {
  try {
    localStorage.setItem('crom_project', JSON.stringify(project));
  } catch (err) {
    console.error('Failed to save project to LocalStorage:', err);
  }
};

// Helper to load from localStorage
const loadFromLocalStorage = (): ProjectConfig => {
  try {
    const saved = localStorage.getItem('crom_project');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.titulo && parsed.cenas) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse project from LocalStorage:', e);
  }
  return defaultProject;
};

const initialProject = loadFromLocalStorage();

export const useEditorStore = create<EditorState>((set) => ({
  project: initialProject,
  selectedSceneId: initialProject.cenas[0]?.id || null,
  activeMenu: null,
  isPlaying: false,
  currentTime: 0,
  activeTemplateSchemas: {},
  isGenerating: false,
  generationLogs: [],
  isRenderModalOpen: false,
  setRenderModalOpen: (isRenderModalOpen) => set({ isRenderModalOpen }),
  
  openRouterKey: localStorage.getItem('openrouter_key') || '',
  setOpenRouterKey: (key) => {
    localStorage.setItem('openrouter_key', key);
    set({ openRouterKey: key });
  },
  openRouterModel: localStorage.getItem('openrouter_model') || 'google/gemini-2.5-flash',
  setOpenRouterModel: (model) => {
    localStorage.setItem('openrouter_model', model);
    set({ openRouterModel: model });
  },
  chatMessages: [],
  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  clearChatMessages: () => set({ chatMessages: [] }),
  isConfigModalOpen: false,
  setConfigModalOpen: (isConfigModalOpen) => set({ isConfigModalOpen }),

  loadProject: (project) => {
    set({ project, selectedSceneId: project.cenas[0]?.id || null, activeMenu: null, currentTime: 0 });
    saveToLocalStorage(project);
  },

  setProjectTitle: (titulo) => set((state) => {
    const updated = { ...state.project, titulo };
    saveToLocalStorage(updated);
    return { project: updated };
  }),
  
  updateGlobalSettings: (settings) => set((state) => {
    const updated = {
      ...state.project,
      configuracoes_globais: { ...state.project.configuracoes_globais, ...settings }
    };
    saveToLocalStorage(updated);
    return { project: updated };
  }),

  updateSoundtrack: (soundtrack) => set((state) => {
    const updated = {
      ...state.project,
      trilha_sonora: { ...state.project.trilha_sonora, ...soundtrack }
    };
    saveToLocalStorage(updated);
    return { project: updated };
  }),

  selectScene: (id) => set({ selectedSceneId: id, currentTime: 0 }),
  
  addScene: (scene) => set((state) => {
    const maxId = state.project.cenas.reduce((max, c) => Math.max(max, c.id), 0);
    const newScene = { ...scene, id: maxId + 1 };
    const updatedProject = { ...state.project, cenas: [...state.project.cenas, newScene] };
    saveToLocalStorage(updatedProject);
    return {
      project: updatedProject,
      selectedSceneId: newScene.id,
      currentTime: 0
    };
  }),

  updateScene: (id, sceneUpdate) => set((state) => {
    const updatedProject = {
      ...state.project,
      cenas: state.project.cenas.map((scene) => 
        scene.id === id ? { ...scene, ...sceneUpdate } : scene
      )
    };
    saveToLocalStorage(updatedProject);
    return { project: updatedProject };
  }),

  duplicateScene: (id) => set((state) => {
    const targetScene = state.project.cenas.find(c => c.id === id);
    if (!targetScene) return {};

    const maxId = state.project.cenas.reduce((max, c) => Math.max(max, c.id), 0);
    const newScene = {
      ...JSON.parse(JSON.stringify(targetScene)),
      id: maxId + 1
    };

    const targetIndex = state.project.cenas.findIndex(c => c.id === id);
    const newCenas = [...state.project.cenas];
    newCenas.splice(targetIndex + 1, 0, newScene);

    const updatedProject = { ...state.project, cenas: newCenas };
    saveToLocalStorage(updatedProject);

    return {
      project: updatedProject,
      selectedSceneId: newScene.id,
      currentTime: 0
    };
  }),

  removeScene: (id) => set((state) => {
    const newScenes = state.project.cenas.filter(c => c.id !== id);
    const updatedProject = { ...state.project, cenas: newScenes };
    saveToLocalStorage(updatedProject);
    return {
      project: updatedProject,
      selectedSceneId: state.selectedSceneId === id ? (newScenes[0]?.id || null) : state.selectedSceneId,
      currentTime: 0
    };
  }),

  reorderScenes: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.project.cenas);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    const updatedProject = { ...state.project, cenas: result };
    saveToLocalStorage(updatedProject);
    return { project: updatedProject };
  }),

  clearProject: () => {
    const updated: ProjectConfig = {
      ...defaultProject,
      cenas: [
        {
          id: 1,
          template: { id: "intro_branding", parametros: { zoom_speed: 1.1, overlay_opacity: 0.5, text0: "CROM STUDIO" } },
          ativos: { media0: { tipo: "imagem", caminho: "assets/img/capa_projeto.jpg" } },
          narracao: { texto: "Bem-vindo ao Crom Video Studio.", voz: "pt-BR-FranciscaNeural" }
        }
      ]
    };
    set({ project: updated, selectedSceneId: 1, currentTime: 0, activeMenu: null });
    saveToLocalStorage(updated);
  },

  toggleMenu: (menu) => set((state) => ({
    activeMenu: state.activeMenu === menu ? null : menu
  })),

  setPlaying: (isPlaying) => set({ isPlaying }),
  
  setCurrentTime: (currentTime) => set({ currentTime }),

  fetchSchemas: async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        const schemasMap: Record<string, any> = {};
        data.forEach((item: any) => {
          schemasMap[item.id] = item.schema;
        });
        set({ activeTemplateSchemas: schemasMap });
      }
    } catch (e) {
      console.error('Failed to fetch template schemas from server:', e);
    }
  },

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  addGenerationLog: (log) => set((state) => ({
    generationLogs: [...state.generationLogs, log]
  })),

  clearGenerationLogs: () => set({ generationLogs: [] })
}));
