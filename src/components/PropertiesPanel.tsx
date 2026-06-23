import React, { useEffect, useState, useRef } from 'react';
import { useEditorStore } from '../store';
import { TEMPLATE_SCHEMAS } from '../data/schemas';
import { Play, Volume2, Plus, Trash2, Image, Video, Upload } from 'lucide-react';
import { validateScene } from '../utils/validation';
import styles from './PropertiesPanel.module.css';

type TabType = 'visual' | 'media' | 'narration';

const PropertiesPanel: React.FC = () => {
  const selectedSceneId = useEditorStore((state) => state.selectedSceneId);
  const project = useEditorStore((state) => state.project);
  const updateScene = useEditorStore((state) => state.updateScene);
  const activeTemplateSchemas = useEditorStore((state) => state.activeTemplateSchemas);
  const currentTime = useEditorStore((state) => state.currentTime);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  
  const currentScene = project.cenas.find(c => c.id === selectedSceneId);
  
  const [activeTab, setActiveTab] = useState<TabType>('visual');
  const [assetsList, setAssetsList] = useState<{imagens: any[], videos: any[], audios: any[]}>({ imagens: [], videos: [], audios: [] });
  const [ttsLoading, setTtsLoading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [uploadingAssetKey, setUploadingAssetKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch local assets list
  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    fetch('/api/assets')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to load assets');
      })
      .then(data => setAssetsList(data))
      .catch(err => console.error('Error fetching assets:', err));
  }, [selectedSceneId]);

  if (!currentScene) {
    return (
      <aside className={styles.emptyPanel}>
        Selecione uma cena para editar suas propriedades
      </aside>
    );
  }

  // Schema: prioritize backend-loaded schemas, fall back to TS static definition
  const schema = activeTemplateSchemas[currentScene.template.id] || TEMPLATE_SCHEMAS[currentScene.template.id];
  const sceneErrors = validateScene(currentScene, schema);

  const handleParamChange = (key: string, value: any) => {
    updateScene(currentScene.id, {
      template: {
        ...currentScene.template,
        parametros: {
          ...currentScene.template.parametros,
          [key]: value
        }
      }
    });

    // UX improvement: if playhead is at the start (0s) and user is editing a text parameter,
    // automatically seek to 1.5s (or middle of scene) so they can see the text preview instantly!
    const keysToJump = ['text', 'title', 'label', 'question', 'answer', 'term', 'definition', 'quote', 'specs', 'cta'];
    const isTextField = keysToJump.some(k => key.toLowerCase().includes(k));
    if (currentTime < 1.5 && isTextField) {
      setCurrentTime(1.5);
    }
  };

  const handleAssetChange = (key: string, path: string, type: 'imagem' | 'video') => {
    updateScene(currentScene.id, {
      ativos: {
        ...currentScene.ativos,
        [key]: { tipo: type, caminho: path }
      }
    });
  };

  const handleFileUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>, allowedTypes: string[]) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type match
    const fileType = file.type.startsWith('image/') ? 'imagem' : file.type.startsWith('video/') ? 'video' : null;
    if (!fileType || !allowedTypes.includes(fileType)) {
      alert(`Tipo de arquivo não permitido. Tipos permitidos: ${allowedTypes.join(', ')}`);
      return;
    }

    setUploadingAssetKey(key);
    const formData = new FormData();
    formData.append('media', file);

    try {
      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Falha no upload do arquivo.');

      const data = await res.json();
      if (data.success && data.caminho) {
        // Update the asset configuration in the current scene
        handleAssetChange(key, data.caminho, fileType);
        
        // Refresh the assets list
        const assetsRes = await fetch('/api/assets');
        if (assetsRes.ok) {
          const assetsData = await assetsRes.json();
          setAssetsList(assetsData);
        }
        
        alert('Arquivo enviado com sucesso e aplicado à cena!');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro no upload: ${err.message}`);
    } finally {
      setUploadingAssetKey(null);
    }
  };

  const handleNarrationChange = (key: string, value: any) => {
    updateScene(currentScene.id, {
      narracao: {
        ...currentScene.narracao,
        [key]: value
      }
    });
  };

  // TTS preview generation and playback
  const handleTtsPlay = async () => {
    if (!currentScene.narracao.texto) return;
    
    setTtsLoading(true);
    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: currentScene.narracao.texto,
          voz: currentScene.narracao.voz || 'pt-BR-FranciscaNeural'
        })
      });

      if (!res.ok) throw new Error('Error in TTS generation');

      const data = await res.json();
      if (data.success && data.audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        
        audio.addEventListener('play', () => setPlayingAudio(true));
        audio.addEventListener('ended', () => setPlayingAudio(false));
        audio.addEventListener('pause', () => setPlayingAudio(false));
        
        audio.play();
      }
    } catch (e) {
      console.error(e);
      alert('Falha ao processar TTS da cena.');
    } finally {
      setTtsLoading(false);
    }
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.subtitle}>Cena selecionada</div>
        <div className={styles.title}>
          {currentScene.template.id.replace(/_/g, ' ')}
        </div>
      </div>

      <nav className={styles.tabs}>
        <button 
          onClick={() => setActiveTab('visual')}
          className={`${styles.tab} ${activeTab === 'visual' ? styles.activeTab : ''}`}
        >
          Visual
        </button>
        <button 
          onClick={() => setActiveTab('media')}
          className={`${styles.tab} ${activeTab === 'media' ? styles.activeTab : ''}`}
        >
          Ativos ({Object.keys(schema?.ativos || {}).length})
        </button>
        <button 
          onClick={() => setActiveTab('narration')}
          className={`${styles.tab} ${activeTab === 'narration' ? styles.activeTab : ''}`}
        >
          Narração
        </button>
      </nav>

      <div className={styles.content}>
        {/* Tab 1: Visual parameters */}
        {activeTab === 'visual' && (
          <div className={styles.fieldGroup}>
            <h3 className={styles.sectionTitle}>
              <span className={`${styles.dot} styles.visual`}></span>
              Parâmetros Visuais
            </h3>
            
            {schema && Object.entries(schema.parametros).map(([key, def]: [string, any]) => {
              const paramError = sceneErrors.find(e => e.field === `parametros.${key}`);
              
              return (
                <div key={key} className={styles.field}>
                  <label className={styles.label}>
                    {key.replace(/_/g, ' ')} {def.obrigatorio && <span className={styles.required}>*</span>}
                  </label>

                  {def.tipo === 'string' && (
                    <input 
                      type="text" 
                      value={currentScene.template.parametros[key] || ''}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className={`${styles.input} ${paramError ? styles.inputError : ''}`}
                      placeholder={def.default?.toString() || ''}
                    />
                  )}

                  {def.tipo === 'number' && (
                    <input 
                      type="number" 
                      value={currentScene.template.parametros[key] !== undefined ? currentScene.template.parametros[key] : (def.default ?? 0)}
                      onChange={(e) => handleParamChange(key, parseFloat(e.target.value) || 0)}
                      step="0.1"
                      className={`${styles.input} ${paramError ? styles.inputError : ''}`}
                    />
                  )}

                  {def.tipo === 'boolean' && (
                    <label className={styles.checkboxContainer}>
                      <input 
                        type="checkbox" 
                        checked={currentScene.template.parametros[key] !== undefined ? !!currentScene.template.parametros[key] : !!def.default}
                        onChange={(e) => handleParamChange(key, e.target.checked)}
                        className={styles.checkbox}
                      />
                      <span className={styles.checkboxLabel}>Ativo</span>
                    </label>
                  )}

                  {def.tipo === 'color' && (
                    <div className={styles.colorContainer}>
                      <input 
                        type="color" 
                        value={currentScene.template.parametros[key] || def.default || '#ffffff'}
                        onChange={(e) => handleParamChange(key, e.target.value)}
                        className={`${styles.colorInput} ${paramError ? styles.inputError : ''}`}
                      />
                      <span className={styles.colorValue}>
                        {currentScene.template.parametros[key] || def.default || '#ffffff'}
                      </span>
                    </div>
                  )}

                  {def.tipo === 'array' && (
                    <div className={`${styles.arrayContainer} ${paramError ? styles.inputError : ''}`}>
                      {((currentScene.template.parametros[key] || def.default || []) as string[]).map((val, idx) => (
                        <div key={idx} className={styles.arrayRow}>
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => {
                              const arr = [...(currentScene.template.parametros[key] || def.default || [])];
                              arr[idx] = e.target.value;
                              handleParamChange(key, arr);
                            }}
                            className={styles.input}
                          />
                          <button
                            onClick={() => {
                              const arr = (currentScene.template.parametros[key] || def.default || []).filter((_: any, i: number) => i !== idx);
                              handleParamChange(key, arr);
                            }}
                            className={styles.deleteButton}
                            title="Remover"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const arr = [...(currentScene.template.parametros[key] || def.default || [])];
                          arr.push('Novo item');
                          handleParamChange(key, arr);
                        }}
                        className={styles.addButton}
                      >
                        <Plus size={14} style={{ marginRight: 4 }} /> Adicionar item
                      </button>
                    </div>
                  )}

                  {def.tipo === 'object' && (
                    <textarea
                      value={JSON.stringify(currentScene.template.parametros[key] || def.default || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          handleParamChange(key, JSON.parse(e.target.value));
                        } catch (err) {}
                      }}
                      className={`${styles.input} ${styles.textarea} ${paramError ? styles.inputError : ''}`}
                    />
                  )}

                  {paramError && (
                    <span className={styles.errorMessage}>
                      {paramError.message}
                    </span>
                  )}
                </div>
              );
            })}

            {(!schema || Object.keys(schema.parametros).length === 0) && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Este template não possui parâmetros configuráveis.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Media Assets */}
        {activeTab === 'media' && (
          <div className={styles.fieldGroup}>
            <h3 className={styles.sectionTitle}>
              <span className={`${styles.dot} styles.media`}></span>
              Ativos de Mídia
            </h3>

            {schema && Object.entries(schema.ativos).map(([key, def]: [string, any]) => {
              const activeAsset = currentScene.ativos[key];
              const allowedTypes = def.tipos_permitidos || ['imagem', 'video'];
              const assetError = sceneErrors.find(e => e.field === `ativos.${key}`);
              
              // Filter files matching allowed template types
              const filteredList = [
                ...(allowedTypes.includes('imagem') ? assetsList.imagens : []),
                ...(allowedTypes.includes('video') ? assetsList.videos : [])
              ];

              return (
                <div key={key} className={`${styles.field} styles.assetSelectContainer`}>
                  <label className={styles.label}>
                    {key.replace(/_/g, ' ')} {def.obrigatorio && <span className={styles.required}>*</span>}
                  </label>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={activeAsset?.caminho || ''}
                      onChange={(e) => {
                        const selectedPath = e.target.value;
                        const fileObj = filteredList.find(f => f.caminho === selectedPath);
                        const fileType = fileObj && assetsList.videos.some(v => v.caminho === selectedPath) ? 'video' : 'imagem';
                        handleAssetChange(key, selectedPath, fileType);
                      }}
                      className={`${styles.input} ${assetError ? styles.inputError : ''}`}
                      style={{ flex: 1 }}
                    >
                      <option value="">-- Selecionar Ativo --</option>
                      {filteredList.map((asset) => (
                        <option key={asset.caminho} value={asset.caminho}>
                          {asset.nome}
                        </option>
                      ))}
                    </select>

                    <label className={styles.uploadBtnLabel} title="Enviar arquivo local">
                      <Upload size={16} />
                      <input 
                        type="file"
                        accept={allowedTypes.includes('imagem') && allowedTypes.includes('video') ? "image/*,video/*" : 
                                allowedTypes.includes('imagem') ? "image/*" : "video/*"}
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(key, e, allowedTypes)}
                        disabled={uploadingAssetKey === key}
                      />
                    </label>
                  </div>

                  {assetError && (
                    <span className={styles.errorMessage}>
                      {assetError.message}
                    </span>
                  )}

                  <div className={styles.assetPreview}>
                    {activeAsset?.caminho ? (
                      activeAsset.tipo === 'video' ? (
                        <div className={styles.assetPreviewPlaceholder}>
                          <Video size={32} color="var(--accent-primary)" />
                          <span>Vídeo: {activeAsset.caminho.split('/').pop()}</span>
                        </div>
                      ) : (
                        <img 
                          src={`/${activeAsset.caminho}`} 
                          alt="Asset Preview" 
                          className={styles.assetPreviewImg}
                        />
                      )
                    ) : (
                      <div className={styles.assetPreviewPlaceholder}>
                        <Image size={32} />
                        <span>Nenhum ativo selecionado</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {(!schema || Object.keys(schema.ativos).length === 0) && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Este template não utiliza ativos de mídia de fundo.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: TTS Narration */}
        {activeTab === 'narration' && (() => {
          const textError = sceneErrors.find(e => e.field === 'narracao.texto');
          return (
            <div className={styles.fieldGroup}>
              <h3 className={styles.sectionTitle}>
                <span className={`${styles.dot} styles.narration`}></span>
                Narração da Cena (TTS)
              </h3>

              <div className={styles.field}>
                <label className={styles.label}>Texto de Narração <span className={styles.required}>*</span></label>
                <textarea
                  value={currentScene.narracao.texto || ''}
                  onChange={(e) => handleNarrationChange('texto', e.target.value)}
                  placeholder="Insira o texto que a inteligência artificial deve falar nesta cena..."
                  className={`${styles.input} ${styles.textarea} ${styles.narration} ${textError ? styles.inputError : ''}`}
                />
                {textError && (
                  <span className={styles.errorMessage}>
                    {textError.message}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Perfil de Voz</label>
                <select
                  value={currentScene.narracao.voz || 'pt-BR-FranciscaNeural'}
                  onChange={(e) => handleNarrationChange('voz', e.target.value)}
                  className={`${styles.input} ${styles.narration}`}
                >
                  <optgroup label="Português (Brasil)">
                    <option value="pt-BR-FranciscaNeural">Francisca (Feminina)</option>
                    <option value="pt-BR-AntonioNeural">Antonio (Masculino)</option>
                  </optgroup>
                  <optgroup label="Inglês (Estados Unidos)">
                    <option value="en-US-AriaNeural">Aria (Feminina)</option>
                    <option value="en-US-GuyNeural">Guy (Masculino)</option>
                  </optgroup>
                </select>
              </div>

              {currentScene.narracao.texto && (
                <div className={styles.ttsActionGroup}>
                  <button
                    onClick={handleTtsPlay}
                    disabled={ttsLoading}
                    className={styles.ttsButton}
                  >
                    {ttsLoading ? (
                      <>
                        <div className={styles.audioSpinner}></div>
                        Gerando Voz...
                      </>
                    ) : playingAudio ? (
                      <>
                        <Volume2 size={16} />
                        Tocando Áudio...
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Ouvir Narração
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </aside>
  );
};

export default PropertiesPanel;
