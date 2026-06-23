import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../store';
import { Image, Video, Music, Upload, Check, Save, Plus } from 'lucide-react';
import styles from './MediaGallery.module.css';

interface MediaItem {
  nome: string;
  caminho: string;
  url: string;
  descricao: string;
}

interface AssetsPayload {
  imagens: MediaItem[];
  videos: MediaItem[];
  audios: MediaItem[];
  outros: MediaItem[];
}

export const MediaGallery: React.FC = () => {
  const selectedSceneId = useEditorStore(state => state.selectedSceneId);
  const project = useEditorStore(state => state.project);
  const updateScene = useEditorStore(state => state.updateScene);

  const [assets, setAssets] = useState<AssetsPayload>({
    imagens: [],
    videos: [],
    audios: [],
    outros: []
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | 'imagens' | 'videos' | 'audios'>('todos');
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load assets from server
  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data: AssetsPayload = await res.json();
        setAssets(data);
        
        // Populate initial descriptions state
        const descMap: Record<string, string> = {};
        const processGroup = (items: MediaItem[]) => {
          items.forEach(item => {
            descMap[item.caminho] = item.descricao || '';
          });
        };
        processGroup(data.imagens);
        processGroup(data.videos);
        processGroup(data.audios);
        processGroup(data.outros);
        setDescriptions(descMap);
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleDescriptionChange = (caminho: string, value: string) => {
    setDescriptions(prev => ({
      ...prev,
      [caminho]: value
    }));
  };

  const handleSaveDescriptions = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/media-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(descriptions)
      });
      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      console.error('Failed to save metadata:', e);
      setSaveStatus('error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    const formData = new FormData();
    formData.append('media', file);

    try {
      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        // Reload assets list upon successful upload
        await loadAssets();
      } else {
        alert('Erro ao fazer upload do arquivo.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erro de conexão ao fazer upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleInsertIntoScene = (item: MediaItem, type: 'imagens' | 'videos' | 'audios') => {
    if (selectedSceneId === null) {
      alert('Selecione uma cena primeiro na linha do tempo.');
      return;
    }

    const scene = project.cenas.find(c => c.id === selectedSceneId);
    if (!scene) return;

    if (type === 'audios') {
      // In CROM soundtracks or narratives, audio can be soundtrack or TTS.
      // If user inserts audio, let's offer soundtrack binding
      useEditorStore.setState(s => ({
        project: {
          ...s.project,
          trilha_sonora: {
            ...s.project.trilha_sonora,
            arquivo: item.caminho
          }
        }
      }));
    } else {
      // Set to media0
      const tipo = type === 'imagens' ? 'imagem' : 'video';
      updateScene(selectedSceneId, {
        ativos: {
          ...scene.ativos,
          media0: {
            tipo,
            caminho: item.caminho
          }
        }
      });
    }
  };

  // Filter lists
  const filteredAssets = () => {
    const list: Array<{ item: MediaItem; type: 'imagens' | 'videos' | 'audios' }> = [];
    if (filter === 'todos' || filter === 'imagens') {
      assets.imagens.forEach(item => list.push({ item, type: 'imagens' }));
    }
    if (filter === 'todos' || filter === 'videos') {
      assets.videos.forEach(item => list.push({ item, type: 'videos' }));
    }
    if (filter === 'todos' || filter === 'audios') {
      assets.audios.forEach(item => list.push({ item, type: 'audios' }));
    }
    return list;
  };

  return (
    <div className={styles.container}>
      <div className={styles.uploadSection}>
        <label className={styles.uploadButton}>
          <Upload size={18} />
          <span>{uploading ? 'Enviando...' : 'Fazer Upload de Mídia'}</span>
          <input 
            type="file" 
            accept="image/*,video/*,audio/*" 
            onChange={handleFileUpload} 
            disabled={uploading} 
            style={{ display: 'none' }} 
          />
        </label>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${filter === 'todos' ? styles.activeTab : ''}`}
          onClick={() => setFilter('todos')}
        >
          Todos
        </button>
        <button 
          className={`${styles.tab} ${filter === 'imagens' ? styles.activeTab : ''}`}
          onClick={() => setFilter('imagens')}
        >
          <Image size={14} /> Imagens
        </button>
        <button 
          className={`${styles.tab} ${filter === 'videos' ? styles.activeTab : ''}`}
          onClick={() => setFilter('videos')}
        >
          <Video size={14} /> Vídeos
        </button>
        <button 
          className={`${styles.tab} ${filter === 'audios' ? styles.activeTab : ''}`}
          onClick={() => setFilter('audios')}
        >
          <Music size={14} /> Áudios
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando galeria...</div>
      ) : (
        <>
          <div className={styles.grid}>
            {filteredAssets().map(({ item, type }) => (
              <div key={item.caminho} className={styles.card}>
                <div className={styles.mediaPreview}>
                  {type === 'imagens' && (
                    <img src={item.url} alt={item.nome} className={styles.thumbnail} />
                  )}
                  {type === 'videos' && (
                    <video src={item.url} className={styles.thumbnail} muted preload="metadata" />
                  )}
                  {type === 'audios' && (
                    <div className={styles.audioPlaceholder}>
                      <Music size={32} />
                    </div>
                  )}
                  <button 
                    className={styles.insertBtn}
                    onClick={() => handleInsertIntoScene(item, type)}
                    title="Inserir esta mídia na cena ativa"
                  >
                    <Plus size={16} /> Inserir
                  </button>
                </div>
                <div className={styles.cardInfo}>
                  <span className={styles.fileName} title={item.nome}>{item.nome}</span>
                  <input
                    type="text"
                    className={styles.descInput}
                    placeholder="Adicionar descrição de contexto IA..."
                    value={descriptions[item.caminho] || ''}
                    onChange={(e) => handleDescriptionChange(item.caminho, e.target.value)}
                  />
                </div>
              </div>
            ))}
            {filteredAssets().length === 0 && (
              <div className={styles.empty}>Nenhuma mídia nesta categoria.</div>
            )}
          </div>

          <div className={styles.footerActions}>
            <button 
              className={styles.saveButton}
              onClick={handleSaveDescriptions}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' && <span>Salvando...</span>}
              {saveStatus === 'saved' && (
                <>
                  <Check size={16} /> <span>Salvo!</span>
                </>
              )}
              {saveStatus === 'error' && <span>Erro ao salvar</span>}
              {saveStatus === 'idle' && (
                <>
                  <Save size={16} /> <span>Salvar Descrições</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
