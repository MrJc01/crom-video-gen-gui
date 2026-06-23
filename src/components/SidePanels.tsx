import React from 'react';
import { useEditorStore } from '../store';
import { TEMPLATE_SCHEMAS } from '../data/schemas';
import { X } from 'lucide-react';
import JsonEditor from './JsonEditor';
import { MediaGallery } from './MediaGallery';
import { ChatAssistant } from './ChatAssistant';
import styles from './SidePanels.module.css';

export const SidePanels: React.FC = () => {
  const activeMenu = useEditorStore(state => state.activeMenu);
  const toggleMenu = useEditorStore(state => state.toggleMenu);
  const addScene = useEditorStore(state => state.addScene);
  const project = useEditorStore(state => state.project);
  const updateGlobalSettings = useEditorStore(state => state.updateGlobalSettings);

  const [audioAssets, setAudioAssets] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    fetch('/api/assets')
      .then(res => res.json())
      .then(data => {
        if (data && data.audios) {
          setAudioAssets(data.audios);
        }
      })
      .catch(err => console.error('Error fetching audio assets:', err));
  }, [activeMenu]);

  if (!activeMenu) return null;

  const handleAddTemplate = (templateId: string) => {
    addScene({
      id: 0,
      template: {
        id: templateId,
        parametros: {}
      },
      ativos: {},
      narracao: { texto: '', voz: 'pt-BR-FranciscaNeural' }
    });
    toggleMenu('templates'); // close after adding
  };

  const getTitle = () => {
    if (activeMenu === 'templates') return 'Templates';
    if (activeMenu === 'settings') return 'Configurações Globais';
    if (activeMenu === 'json') return 'Editor JSON';
    if (activeMenu === 'gallery') return 'Galeria de Mídias';
    if (activeMenu === 'chat') return 'Assistente Criativo IA';
    return '';
  };

  return (
    <div className={styles.panelContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {getTitle()}
        </h2>
        <button className={styles.closeButton} onClick={() => toggleMenu(activeMenu)}>
          <X size={20} />
        </button>
      </div>

      <div className={styles.content}>
        {activeMenu === 'templates' && (
          <div className={styles.templateGrid}>
            {Object.keys(TEMPLATE_SCHEMAS).map(id => (
              <div key={id} className={styles.templateCard} onClick={() => handleAddTemplate(id)}>
                <div className={styles.templateName}>{id.replace(/_/g, ' ')}</div>
                <div className={styles.templateDesc}>Clique para adicionar à timeline</div>
              </div>
            ))}
          </div>
        )}

        {activeMenu === 'settings' && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Resolução</label>
              <select 
                className={styles.input}
                value={project.configuracoes_globais.resolucao}
                onChange={(e) => updateGlobalSettings({ resolucao: e.target.value })}
              >
                <option value="1920x1080">1920x1080 (16:9 HD)</option>
                <option value="1080x1920">1080x1920 (9:16 Shorts/Reels)</option>
                <option value="1080x1080">1080x1080 (1:1 Quadrado)</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>FPS</label>
              <input 
                type="number" 
                className={styles.input}
                value={project.configuracoes_globais.fps}
                onChange={(e) => updateGlobalSettings({ fps: parseInt(e.target.value) || 30 })}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Formato de Saída</label>
              <select 
                className={styles.input}
                value={project.configuracoes_globais.formato_saida}
                onChange={(e) => updateGlobalSettings({ formato_saida: e.target.value })}
              >
                <option value="mp4">MP4</option>
                <option value="mov">MOV</option>
              </select>
            </div>
            
            <hr style={{ borderColor: 'var(--glass-border)', margin: '12px 0' }} />
            
            <div className={styles.field}>
              <label className={styles.label}>Arquivo de Trilha Sonora</label>
              <select
                className={styles.input}
                value={project.trilha_sonora.arquivo}
                onChange={(e) => useEditorStore.setState(s => ({
                  project: { ...s.project, trilha_sonora: { ...s.project.trilha_sonora, arquivo: e.target.value } }
                }))}
              >
                <option value="">Sem trilha sonora</option>
                {audioAssets.map(audio => (
                  <option key={audio.caminho} value={audio.caminho}>
                    {audio.nome}
                  </option>
                ))}
                {project.trilha_sonora.arquivo && !audioAssets.some(a => a.caminho === project.trilha_sonora.arquivo) && (
                  <option value={project.trilha_sonora.arquivo}>
                    {project.trilha_sonora.arquivo} (Não encontrado!)
                  </option>
                )}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Volume Trilha Sonora</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                max="1"
                className={styles.input}
                value={project.trilha_sonora.volume}
                onChange={(e) => useEditorStore.setState(s => ({ 
                  project: { ...s.project, trilha_sonora: { ...s.project.trilha_sonora, volume: parseFloat(e.target.value) } } 
                }))}
              />
            </div>
          </>
        )}

        {activeMenu === 'json' && (
          <JsonEditor />
        )}

        {activeMenu === 'gallery' && (
          <MediaGallery />
        )}

        {activeMenu === 'chat' && (
          <ChatAssistant />
        )}
      </div>
    </div>
  );
};
