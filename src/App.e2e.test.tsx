import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { useEditorStore } from './store';

// Mock fetch globally for all test runs
window.fetch = vi.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([])
  })
) as any;

// Mock scrollIntoView for JSDOM
Element.prototype.scrollIntoView = vi.fn();

describe('Estúdio de Vídeo - 30 Testes de Integração / E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset Zustand store to a stable mock project
    useEditorStore.setState({
      project: {
        titulo: "Vídeo E2E Teste",
        configuracoes_globais: {
          resolucao: "1920x1080",
          fps: 30,
          formato_saida: "mp4",
          audio: { sample_rate: 48000, bitrate: "320k", canais: 2, codec: "aac", normalizar_volume: true }
        },
        trilha_sonora: { arquivo: "", volume: 0.1, loop: true },
        cenas: [
          {
            id: 1,
            template: { id: "intro_branding", parametros: { zoom_speed: 1.1, text0: "E2E INTRO" } },
            ativos: { media0: { tipo: "imagem", caminho: "assets/img/capa_projeto.jpg" } },
            narracao: { texto: "Texto da cena 1.", voz: "pt-BR-FranciscaNeural" }
          }
        ]
      },
      selectedSceneId: 1,
      activeMenu: null,
      isPlaying: false,
      currentTime: 0,
      activeTemplateSchemas: {
        intro_branding: {
          ativos: { media0: { obrigatorio: true, tipos_permitidos: ["imagem"] } },
          parametros: {
            zoom_speed: { obrigatorio: false, tipo: "number" },
            text0: { obrigatorio: false, tipo: "string" }
          }
        }
      }
    });
  });

  // 1. Render tests
  it('1. Deve renderizar a barra lateral com a logo emoji corretora', () => {
    render(<App />);
    expect(screen.getByText('🎬')).toBeInTheDocument();
  });

  it('2. Deve renderizar o Canvas contendo o iframe de preview', () => {
    render(<App />);
    const iframe = screen.getByTitle('Scene Preview');
    expect(iframe).toBeInTheDocument();
  });

  it('3. Deve carregar a resolução global no badge do cabeçalho', () => {
    render(<App />);
    expect(screen.getByText(/1920x1080 • 30 FPS/i)).toBeInTheDocument();
  });

  it('4. Deve carregar a timeline contendo a lista com a primeira cena', () => {
    render(<App />);
    expect(screen.getByText(/Linha do Tempo/i)).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
  });

  // 2. Sidebar Navigation tests
  it('5. Deve alternar para o menu de Templates na sidebar ao clicar no botão correspondente', () => {
    render(<App />);
    const templatesBtn = screen.getByTitle('Templates');
    fireEvent.click(templatesBtn);
    expect(useEditorStore.getState().activeMenu).toBe('templates');
  });

  it('6. Deve alternar para o menu de Configurações na sidebar', () => {
    render(<App />);
    const configBtn = screen.getByTitle('Configurações Globais');
    fireEvent.click(configBtn);
    expect(useEditorStore.getState().activeMenu).toBe('settings');
  });

  it('7. Deve alternar para o menu JSON na sidebar', () => {
    render(<App />);
    const jsonBtn = screen.getByTitle('Visualizar JSON');
    fireEvent.click(jsonBtn);
    expect(useEditorStore.getState().activeMenu).toBe('json');
  });

  // 3. Playback Engine tests
  it('8. Deve iniciar a reprodução ao clicar no botão Play', () => {
    render(<App />);
    const playBtn = screen.getByTitle('Play');
    fireEvent.click(playBtn);
    expect(useEditorStore.getState().isPlaying).toBe(true);
  });

  it('9. Deve pausar a reprodução ao clicar no botão Pause', () => {
    useEditorStore.setState({ isPlaying: true });
    render(<App />);
    const pauseBtn = screen.getByTitle('Pause');
    fireEvent.click(pauseBtn);
    expect(useEditorStore.getState().isPlaying).toBe(false);
  });

  it('10. Deve resetar o tempo para 0 ao clicar no botão de voltar ao início', () => {
    useEditorStore.setState({ currentTime: 2.5 });
    render(<App />);
    const resetBtn = screen.getByTitle('Voltar ao início');
    fireEvent.click(resetBtn);
    expect(useEditorStore.getState().currentTime).toBe(0);
  });

  it('11. Deve atualizar currentTime ao mover o slider de reprodução', () => {
    render(<App />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: 1.5 } });
    expect(useEditorStore.getState().currentTime).toBe(1.5);
  });

  // 4. Scene Management tests
  it('12. Deve criar uma nova cena padrão ao clicar no botão Nova Cena', () => {
    render(<App />);
    const addBtn = screen.getByText('Nova Cena');
    fireEvent.click(addBtn);
    expect(useEditorStore.getState().project.cenas.length).toBe(2);
  });

  it('13. Deve duplicar a cena ativa com sucesso', () => {
    render(<App />);
    const duplicateBtn = screen.getByTitle('Duplicar cena');
    fireEvent.click(duplicateBtn);
    expect(useEditorStore.getState().project.cenas.length).toBe(2);
    expect(useEditorStore.getState().project.cenas[1].template.parametros.text0).toBe('E2E INTRO');
  });

  it('14. Deve remover a cena se o usuário confirmar e houver mais de uma', () => {
    useEditorStore.setState({
      project: {
        ...useEditorStore.getState().project,
        cenas: [
          ...useEditorStore.getState().project.cenas,
          { id: 2, template: { id: "outro", parametros: {} }, ativos: {}, narracao: { texto: "", voz: "" } }
        ]
      }
    });
    window.confirm = () => true;
    render(<App />);
    const deleteBtns = screen.getAllByTitle('Excluir cena');
    fireEvent.click(deleteBtns[0]);
    expect(useEditorStore.getState().project.cenas.length).toBe(1);
  });

  it('15. Deve alertar o usuário se ele tentar excluir a única cena', () => {
    window.alert = vi.fn();
    render(<App />);
    const deleteBtn = screen.getByTitle('Excluir cena');
    fireEvent.click(deleteBtn);
    expect(window.alert).toHaveBeenCalledWith('O projeto precisa ter pelo menos uma cena.');
    expect(useEditorStore.getState().project.cenas.length).toBe(1);
  });

  // 5. Properties Panel tabs
  it('16. Deve renderizar a aba de propriedades visuais por padrão', () => {
    render(<App />);
    expect(screen.getByText('Parâmetros Visuais')).toBeInTheDocument();
  });

  it('17. Deve renderizar a aba de Ativos ao clicar na aba correspondente', () => {
    render(<App />);
    const mediaTab = screen.getByText(/Ativos/);
    fireEvent.click(mediaTab);
    expect(screen.getByText('Ativos de Mídia')).toBeInTheDocument();
  });

  it('18. Deve renderizar a aba de Narração ao clicar na aba correspondente', () => {
    render(<App />);
    const ttsTab = screen.getByText('Narração');
    fireEvent.click(ttsTab);
    expect(screen.getByText('Narração da Cena (TTS)')).toBeInTheDocument();
  });

  // 6. Properties Form fields modifications
  it('19. Deve atualizar string de parâmetro visual no formulário', () => {
    render(<App />);
    const input = screen.getByDisplayValue('E2E INTRO');
    fireEvent.change(input, { target: { value: 'NOVO TEXTO' } });
    expect(useEditorStore.getState().project.cenas[0].template.parametros.text0).toBe('NOVO TEXTO');
  });

  it('20. Deve atualizar número de parâmetro visual no formulário', () => {
    render(<App />);
    const numberInput = screen.getByRole('spinbutton');
    fireEvent.change(numberInput, { target: { value: '1.5' } });
    expect(useEditorStore.getState().project.cenas[0].template.parametros.zoom_speed).toBe(1.5);
  });

  it('21. Deve atualizar o texto de narração', () => {
    render(<App />);
    const ttsTab = screen.getByText('Narração');
    fireEvent.click(ttsTab);
    const textarea = screen.getByPlaceholderText(/Insira o texto/);
    fireEvent.change(textarea, { target: { value: 'Nova fala de narração.' } });
    expect(useEditorStore.getState().project.cenas[0].narracao.texto).toBe('Nova fala de narração.');
  });

  it('22. Deve atualizar a voz selecionada no dropdown de narração', () => {
    render(<App />);
    const ttsTab = screen.getByText('Narração');
    fireEvent.click(ttsTab);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'pt-BR-AntonioNeural' } });
    expect(useEditorStore.getState().project.cenas[0].narracao.voz).toBe('pt-BR-AntonioNeural');
  });

  // 7. Global Settings tests
  it('23. Deve atualizar resolução do projeto', () => {
    useEditorStore.setState({ activeMenu: 'settings' });
    render(<App />);
    const select = screen.getByDisplayValue('1920x1080 (16:9 HD)');
    fireEvent.change(select, { target: { value: '1080x1920' } });
    expect(useEditorStore.getState().project.configuracoes_globais.resolucao).toBe('1080x1920');
  });

  it('24. Deve atualizar FPS global do projeto', () => {
    useEditorStore.setState({ activeMenu: 'settings' });
    render(<App />);
    const fpsInput = screen.getByDisplayValue('30');
    fireEvent.change(fpsInput, { target: { value: '60' } });
    expect(useEditorStore.getState().project.configuracoes_globais.fps).toBe(60);
  });

  it('25. Deve atualizar volume da trilha sonora global', () => {
    useEditorStore.setState({ activeMenu: 'settings' });
    render(<App />);
    const volumeInput = screen.getByDisplayValue('0.1');
    fireEvent.change(volumeInput, { target: { value: '0.8' } });
    expect(useEditorStore.getState().project.trilha_sonora.volume).toBe(0.8);
  });

  // 8. JSON Editor panel tests
  it('26. Deve carregar o JSON do projeto formatado no editor JSON', () => {
    useEditorStore.setState({ activeMenu: 'json' });
    render(<App />);
    const textarea = screen.getByPlaceholderText(/Insira as configurações JSON/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Vídeo E2E Teste');
  });

  it('27. Deve marcar JSON como inválido se houver erro de sintaxe', () => {
    useEditorStore.setState({ activeMenu: 'json' });
    render(<App />);
    const textarea = screen.getByPlaceholderText(/Insira as configurações JSON/i);
    fireEvent.change(textarea, { target: { value: '{ "projeto": ' } });
    expect(textarea).toHaveClass(/errorTextarea/);
  });

  // 9. Generation Modal triggers
  it('28. Deve abrir o modal de renderização ao clicar no botão correspondente na sidebar', () => {
    render(<App />);
    const renderBtn = screen.getByTitle('Gerar Vídeo');
    fireEvent.click(renderBtn);
    expect(screen.getByText('Gerar Vídeo Final (crom-video-gen)')).toBeInTheDocument();
  });

  it('29. Deve carregar a configuração de TTS padrão no modal de renderização', () => {
    render(<App />);
    const renderBtn = screen.getByTitle('Gerar Vídeo');
    fireEvent.click(renderBtn);
    const selects = screen.getAllByRole('combobox');
    expect((selects[0] as HTMLSelectElement).value).toBe('edge-tts');
  });

  it('30. Deve resetar o tempo para 0 na troca de cenas na timeline', () => {
    useEditorStore.setState({ currentTime: 4.0 });
    render(<App />);
    const addBtn = screen.getByText('Nova Cena');
    fireEvent.click(addBtn);
    // Select dynamic newly created scene
    const timelineCards = screen.getAllByText('Nova Cena');
    fireEvent.click(timelineCards[0]);
    expect(useEditorStore.getState().currentTime).toBe(0);
  });

  it('31. Deve disparar exportação de JSON ao clicar no botão da sidebar', () => {
    window.URL.createObjectURL = vi.fn(() => 'blob:sidebar-url');
    window.URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<App />);
    const exportBtn = screen.getByTitle('Exportar JSON');
    fireEvent.click(exportBtn);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('32. Deve fazer download do arquivo JSON ao clicar no botão no Editor JSON', () => {
    useEditorStore.setState({ activeMenu: 'json' });
    window.URL.createObjectURL = vi.fn(() => 'blob:editor-url');
    window.URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<App />);
    const downloadBtn = screen.getByTitle('Download JSON config file');
    fireEvent.click(downloadBtn);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('33. Deve aplicar JSON e abrir modal de renderização ao clicar em Gerar Vídeo no Editor JSON', () => {
    useEditorStore.setState({ activeMenu: 'json' });
    render(<App />);
    const textarea = screen.getByPlaceholderText(/Insira as configurações JSON/i) as HTMLTextAreaElement;
    
    // Change project title inside json text
    const updatedJson = JSON.stringify({
      projeto: {
        ...useEditorStore.getState().project,
        titulo: "Titulo Editado JSON"
      }
    }, null, 2);
    
    fireEvent.change(textarea, { target: { value: updatedJson } });
    
    const generateBtn = screen.getByTitle('Apply and open render modal');
    fireEvent.click(generateBtn);
    
    expect(useEditorStore.getState().project.titulo).toBe("Titulo Editado JSON");
    expect(useEditorStore.getState().isRenderModalOpen).toBe(true);
    expect(screen.getByText('Gerar Vídeo Final (crom-video-gen)')).toBeInTheDocument();
  });

  it('34. Deve simular progresso da renderização até conclusão no modal de geração', async () => {
    // Open the modal directly
    useEditorStore.setState({ isRenderModalOpen: true });
    
    // Mock the global EventSource and fetch for rendering
    let mockEventSourceInstance: any = null;
    class MockEventSource {
      onmessage = null;
      onerror = null;
      close = vi.fn();
      constructor() {
        mockEventSourceInstance = this;
      }
    }
    window.EventSource = MockEventSource as any;
    
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ jobId: "job_123", status: "running" })
      }) as any
    );
    
    render(<App />);
    
    // Click render button inside modal
    const startRenderBtn = screen.getByText('Iniciar Renderização');
    fireEvent.click(startRenderBtn);
    
    expect(fetchSpy).toHaveBeenCalledWith('/api/generate', expect.any(Object));
    
    // Wait for the EventSource to be created asynchronously
    await waitFor(() => {
      expect(mockEventSourceInstance).not.toBeNull();
    });
    
    // Simulate SSE logs stream messages
    expect(mockEventSourceInstance.onmessage).toBeTypeOf('function');
    
    // Log message 1: Processing
    act(() => {
      mockEventSourceInstance.onmessage({
        data: JSON.stringify({ log: "Cena renderizada com sucesso cena_id=1" })
      });
    });
    
    // Check if progress percent reflects in modal (1 cena out of 1 -> 99%)
    await screen.findByText('99%');
    
    // Log message 2: Completed
    act(() => {
      mockEventSourceInstance.onmessage({
        data: JSON.stringify({ status: "completed", outputUrl: "/output/test.mp4" })
      });
    });
    
    await screen.findByText('Vídeo Renderizado com Sucesso!');
    await screen.findByText('Baixar Vídeo MP4');
    
    fetchSpy.mockRestore();
  });

  it('35. Deve simular geração de vídeo em formato vertical (9:16) com template cinematic_video', async () => {
    useEditorStore.setState({
      project: {
        ...useEditorStore.getState().project,
        titulo: "Cinematic Vertical",
        configuracoes_globais: {
          ...useEditorStore.getState().project.configuracoes_globais,
          resolucao: "1080x1920"
        },
        cenas: [
          {
            id: 1,
            template: { id: "cinematic_video", parametros: { blur_amount: 5, color_grading: "sepia" } },
            ativos: { media0: { tipo: "video", caminho: "assets/video/intro.mp4" } },
            narracao: { texto: "Cena cinematografica vertical.", voz: "pt-BR-FranciscaNeural" }
          }
        ]
      },
      isRenderModalOpen: true
    });

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ jobId: "job_cinematic", status: "running" })
      }) as any
    );

    render(<App />);

    const startRenderBtn = screen.getByText('Iniciar Renderização');
    act(() => {
      fireEvent.click(startRenderBtn);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      body: expect.stringContaining('"resolucao":"1080x1920"')
    }));
    expect(fetchSpy).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      body: expect.stringContaining('"id":"cinematic_video"')
    }));

    fetchSpy.mockRestore();
  });

  it('36. Deve simular geração de vídeo quadrado (1:1) com template technical_specs', async () => {
    useEditorStore.setState({
      project: {
        ...useEditorStore.getState().project,
        titulo: "Specs Quadrado",
        configuracoes_globais: {
          ...useEditorStore.getState().project.configuracoes_globais,
          resolucao: "1080x1080"
        },
        cenas: [
          {
            id: 1,
            template: { 
              id: "technical_specs", 
              parametros: { highlight_color: "#ffaa00", list_style: "numbered", specs: ["CPU 8-core", "16GB RAM"] } 
            },
            ativos: { media0: { tipo: "imagem", caminho: "assets/img/capa_projeto.jpg" } },
            narracao: { texto: "Especificacoes tecnicas do sistema.", voz: "pt-BR-FranciscaNeural" }
          }
        ]
      },
      isRenderModalOpen: true
    });

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ jobId: "job_specs", status: "running" })
      }) as any
    );

    render(<App />);

    const startRenderBtn = screen.getByText('Iniciar Renderização');
    act(() => {
      fireEvent.click(startRenderBtn);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      body: expect.stringContaining('"resolucao":"1080x1080"')
    }));
    expect(fetchSpy).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      body: expect.stringContaining('"id":"technical_specs"')
    }));

    fetchSpy.mockRestore();
  });

  it('37. Deve enviar configuração de trilha sonora no payload do build', async () => {
    useEditorStore.setState({
      project: {
        ...useEditorStore.getState().project,
        trilha_sonora: { arquivo: "assets/audio/ambient_techno.mp3", volume: 0.5, loop: true }
      },
      isRenderModalOpen: true
    });

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ jobId: "job_soundtrack", status: "running" })
      }) as any
    );

    render(<App />);

    const startRenderBtn = screen.getByText('Iniciar Renderização');
    act(() => {
      fireEvent.click(startRenderBtn);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      body: expect.stringContaining('"arquivo":"assets/audio/ambient_techno.mp3"')
    }));
    expect(fetchSpy).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      body: expect.stringContaining('"volume":0.5')
    }));

    fetchSpy.mockRestore();
  });

  it('38. Deve carregar especificações de pré-compilação e toggle do JSON no modal', async () => {
    useEditorStore.setState({
      project: {
        ...useEditorStore.getState().project,
        titulo: "Projeto Teste JSON Specs"
      },
      isRenderModalOpen: true
    });

    render(<App />);

    expect(screen.getByText('Especificações de Compilação (Pre-Build Specs)')).toBeInTheDocument();
    expect(screen.getAllByText('Projeto Teste JSON Specs').length).toBeGreaterThanOrEqual(1);

    const toggleBtn = screen.getByText('[+] Visualizar JSON do Pré-Compilador');
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId('precompiler-json')).toBeInTheDocument();
    expect(screen.getByTestId('precompiler-json').textContent).toContain('"titulo": "Projeto Teste JSON Specs"');

    const toggleBtnClose = screen.getByText('[-] Ocultar JSON do Pré-Compilador');
    fireEvent.click(toggleBtnClose);

    expect(screen.queryByTestId('precompiler-json')).not.toBeInTheDocument();
  });

  it('39. Deve simular a geração de vídeo com trilha sonora vazia (Sem trilha sonora)', async () => {
    useEditorStore.setState({
      project: {
        ...useEditorStore.getState().project,
        titulo: "Sem Trilha Sonora Teste",
        trilha_sonora: { arquivo: "", volume: 0.1, loop: true }
      },
      isRenderModalOpen: true
    });

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ jobId: "job_no_soundtrack", status: "running" })
      }) as any
    );

    render(<App />);

    const startRenderBtn = screen.getByText('Iniciar Renderização');
    act(() => {
      fireEvent.click(startRenderBtn);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      body: expect.stringContaining('"arquivo":""')
    }));

    fetchSpy.mockRestore();
  });

  it('40. Deve simular a geração de vídeo com múltiplos templates em sequência', async () => {
    useEditorStore.setState({
      project: {
        ...useEditorStore.getState().project,
        titulo: "Multi-Cena Teste",
        cenas: [
          {
            id: 1,
            template: { id: "intro_branding", parametros: { text0: "Cena 1" } },
            ativos: {},
            narracao: { texto: "Texto 1", voz: "pt-BR-FranciscaNeural" }
          },
          {
            id: 2,
            template: { id: "dashboard_kpi", parametros: { metric_value: "100%", metric_label: "Fidelidade" } },
            ativos: {},
            narracao: { texto: "Texto 2", voz: "pt-BR-FranciscaNeural" }
          },
          {
            id: 3,
            template: { id: "outro_credits", parametros: { text0: "Fim" } },
            ativos: {},
            narracao: { texto: "Texto 3", voz: "pt-BR-FranciscaNeural" }
          }
        ]
      },
      isRenderModalOpen: true
    });

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ jobId: "job_multi_scene", status: "running" })
      }) as any
    );

    render(<App />);

    const startRenderBtn = screen.getByText('Iniciar Renderização');
    act(() => {
      fireEvent.click(startRenderBtn);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      body: expect.stringContaining('"id":"intro_branding"')
    }));
    expect(fetchSpy).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      body: expect.stringContaining('"id":"dashboard_kpi"')
    }));
    expect(fetchSpy).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      body: expect.stringContaining('"id":"outro_credits"')
    }));

    fetchSpy.mockRestore();
  });

  it('41. Deve verificar o comportamento do botão "Tentar Novamente" após falha no processamento', async () => {
    useEditorStore.setState({ isRenderModalOpen: true });

    let mockEventSourceInstance: any = null;
    class MockEventSource {
      onmessage = null;
      onerror = null;
      close = vi.fn();
      constructor() {
        mockEventSourceInstance = this;
      }
    }
    window.EventSource = MockEventSource as any;

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ jobId: "job_fail", status: "running" })
      }) as any
    );

    render(<App />);

    const startRenderBtn = screen.getByText('Iniciar Renderização');
    act(() => {
      fireEvent.click(startRenderBtn);
    });

    await waitFor(() => {
      expect(mockEventSourceInstance).not.toBeNull();
    });

    act(() => {
      mockEventSourceInstance.onmessage({
        data: JSON.stringify({ log: "Erro crítico no FFmpeg" })
      });
      mockEventSourceInstance.onmessage({
        data: JSON.stringify({ status: "failed" })
      });
    });

    await screen.findByText('Renderização finalizada com erro.');

    const retryBtn = screen.getByText('Tentar Novamente');
    act(() => {
      fireEvent.click(retryBtn);
    });

    expect(screen.getByText('Provedor de TTS (Narração)')).toBeInTheDocument();

    fetchSpy.mockRestore();
  });

  it('42. Deve testar a reordenação de cenas e verificar se o JSON de pré-compilação reflete a nova ordem', async () => {
    useEditorStore.setState({
      project: {
        ...useEditorStore.getState().project,
        titulo: "Reorder Test",
        cenas: [
          {
            id: 1,
            template: { id: "intro_branding", parametros: { text0: "Primeira" } },
            ativos: {},
            narracao: { texto: "Texto 1", voz: "pt-BR" }
          },
          {
            id: 2,
            template: { id: "outro_credits", parametros: { text0: "Segunda" } },
            ativos: {},
            narracao: { texto: "Texto 2", voz: "pt-BR" }
          }
        ]
      },
      isRenderModalOpen: true
    });

    render(<App />);

    const toggleBtn = screen.getByText('[+] Visualizar JSON do Pré-Compilador');
    act(() => {
      fireEvent.click(toggleBtn);
    });

    let jsonContent = screen.getByTestId('precompiler-json').textContent || '';
    let idxPrimeira = jsonContent.indexOf('Primeira');
    let idxSegunda = jsonContent.indexOf('Segunda');
    expect(idxPrimeira).toBeLessThan(idxSegunda);

    act(() => {
      useEditorStore.getState().reorderScenes(0, 1);
    });

    jsonContent = screen.getByTestId('precompiler-json').textContent || '';
    idxPrimeira = jsonContent.indexOf('Primeira');
    idxSegunda = jsonContent.indexOf('Segunda');
    expect(idxSegunda).toBeLessThan(idxPrimeira);
  });

  it('43. Deve testar a alteração do provedor de TTS no modal de renderização', async () => {
    useEditorStore.setState({ isRenderModalOpen: true });

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ jobId: "job_tts_provider", status: "running" })
      }) as any
    );

    render(<App />);

    const ttsSelect = screen.getByLabelText('Provedor de TTS (Narração)') as HTMLSelectElement;
    
    act(() => {
      fireEvent.change(ttsSelect, { target: { value: 'mock' } });
    });

    expect(ttsSelect.value).toBe('mock');

    const startRenderBtn = screen.getByText('Iniciar Renderização');
    act(() => {
      fireEvent.click(startRenderBtn);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      body: expect.stringContaining('"ttsProvider":"mock"')
    }));

    fetchSpy.mockRestore();
  });

  it('44. Deve abrir o painel da Galeria de Mídias e renderizar ativos', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/assets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            imagens: [{ nome: 'img1.png', caminho: 'assets/img/img1.png', url: '/assets/img/img1.png', descricao: 'Imagem 1' }],
            videos: [],
            audios: [],
            outros: []
          })
        }) as any;
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) }) as any;
    });

    useEditorStore.setState({ activeMenu: 'gallery' });
    render(<App />);

    await screen.findByText('Galeria de Mídias');
    await screen.findByText('img1.png');
    
    const input = screen.getByDisplayValue('Imagem 1') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    fetchSpy.mockRestore();
  });

  it('45. Deve salvar descrições editadas na Galeria de Mídias', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/assets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            imagens: [{ nome: 'img1.png', caminho: 'assets/img/img1.png', url: '/assets/img/img1.png', descricao: 'Imagem 1' }],
            videos: [],
            audios: [],
            outros: []
          })
        }) as any;
      }
      if (typeof url === 'string' && url.includes('/api/media-metadata')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }) as any;
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) }) as any;
    });

    useEditorStore.setState({ activeMenu: 'gallery' });
    render(<App />);

    await screen.findByText('img1.png');
    const input = screen.getByDisplayValue('Imagem 1') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'Nova Descricao Img' } });
    
    const saveBtn = screen.getByText('Salvar Descrições');
    fireEvent.click(saveBtn);

    await screen.findByText('Salvo!');

    expect(fetchSpy).toHaveBeenCalledWith('/api/media-metadata', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        'assets/img/img1.png': 'Nova Descricao Img'
      })
    }));

    fetchSpy.mockRestore();
  });

  it('46. Deve abrir o ApiKeyModal, atualizar a chave e o modelo, e salvar no localStorage', async () => {
    useEditorStore.setState({ isConfigModalOpen: true, openRouterKey: '', openRouterModel: 'google/gemini-2.5-flash' });
    render(<App />);

    expect(screen.getByText('Configurações da API')).toBeInTheDocument();
    
    const keyInput = screen.getByPlaceholderText('sk-or-v1-...') as HTMLInputElement;
    const modelSelect = screen.getByDisplayValue('Gemini 2.5 Flash (Recomendado)') as HTMLSelectElement;

    fireEvent.change(keyInput, { target: { value: 'sk-or-v1-testkey' } });
    fireEvent.change(modelSelect, { target: { value: 'google/gemini-2.0-flash-lite:free' } });

    const saveBtn = screen.getByText('Salvar Configuração');
    fireEvent.click(saveBtn);

    expect(useEditorStore.getState().openRouterKey).toBe('sk-or-v1-testkey');
    expect(useEditorStore.getState().openRouterModel).toBe('google/gemini-2.0-flash-lite:free');
    expect(localStorage.getItem('openrouter_key')).toBe('sk-or-v1-testkey');
    expect(localStorage.getItem('openrouter_model')).toBe('google/gemini-2.0-flash-lite:free');
  });

  it('47. Deve testar a conexão no ApiKeyModal e mostrar feedback de sucesso', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Conexão de teste bem-sucedida!' })
      }) as any
    );

    useEditorStore.setState({ isConfigModalOpen: true, openRouterKey: '', openRouterModel: 'google/gemini-2.5-flash' });
    render(<App />);

    const keyInput = screen.getByPlaceholderText('sk-or-v1-...') as HTMLInputElement;
    fireEvent.change(keyInput, { target: { value: 'sk-or-v1-testkey' } });

    const testBtn = screen.getByText('Testar Conexão');
    fireEvent.click(testBtn);

    await screen.findByText('Conexão estabelecida com sucesso!');
    expect(fetchSpy).toHaveBeenCalledWith('/api/chat/agent', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'x-openrouter-key': 'sk-or-v1-testkey'
      })
    }));

    fetchSpy.mockRestore();
  });

  it('48. Deve abrir o Chat Assistant, enviar mensagem e aplicar sugestão de criação de cena', async () => {
    const mockAgentResponse = {
      message: 'Sugeri criar uma nova cena de introdução.',
      suggestion: {
        action: 'create',
        scene: {
          id: 0,
          template: { id: 'intro_branding', parametros: { text0: 'Cena da IA' } },
          ativos: {},
          narracao: { texto: 'Oi da IA', voz: 'pt-BR' }
        }
      }
    };

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAgentResponse)
      }) as any
    );

    useEditorStore.setState({
      activeMenu: 'chat',
      openRouterKey: 'sk-or-v1-key',
      project: {
        titulo: 'Chat Project',
        configuracoes_globais: { resolucao: '1920x1080', fps: 30, formato_saida: 'mp4', audio: { sample_rate: 48000, bitrate: '320k', canais: 2, codec: 'aac', normalizar_volume: true } },
        trilha_sonora: { arquivo: '', volume: 0.1, loop: true },
        cenas: []
      }
    });

    render(<App />);

    await screen.findByText('Assistente Criativo de IA');
    const input = screen.getByPlaceholderText('Peça para criar ou alterar uma cena...');
    
    fireEvent.change(input, { target: { value: 'Gere uma cena' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Wait for the message bubble to contain the response message
    await screen.findByText('Sugeri criar uma nova cena de introdução.');
    await screen.findByText('Sugestão de Alteração:');

    const applyBtn = screen.getByText('Aplicar Alterações');
    fireEvent.click(applyBtn);

    expect(useEditorStore.getState().project.cenas.length).toBe(1);
    expect(useEditorStore.getState().project.cenas[0].template.parametros.text0).toBe('Cena da IA');

    fetchSpy.mockRestore();
  });
});

