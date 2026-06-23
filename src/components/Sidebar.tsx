import React, { useRef } from 'react';
import { Download, Upload, Settings, LayoutTemplate, Play, Code, Image, MessageSquare } from 'lucide-react';
import styles from './Sidebar.module.css';
import { useEditorStore } from '../store';

const Sidebar: React.FC = () => {
  const project = useEditorStore(state => state.project);
  const loadProject = useEditorStore(state => state.loadProject);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleMenu = useEditorStore(state => state.toggleMenu);
  const activeMenu = useEditorStore(state => state.activeMenu);
  const setRenderModalOpen = useEditorStore(state => state.setRenderModalOpen);

  const handleExportJson = () => {
    const dataStr = JSON.stringify({ projeto: project }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.titulo.replace(/\s+/g, '_').toLowerCase()}_config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        loadProject(json.projeto ? json.projeto : json);
        alert('Projeto importado com sucesso!');
      } catch (err) {
        alert('Falha ao processar arquivo JSON.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        🎬
      </div>
      
      <button 
        className={styles.iconButton} 
        title="Templates" 
        onClick={() => toggleMenu('templates')}
        style={activeMenu === 'templates' ? { color: 'var(--accent-primary)' } : {}}
      >
        <div className={styles.iconWrapper} style={activeMenu === 'templates' ? { backgroundColor: 'rgba(6, 182, 212, 0.1)' } : {}}>
          <LayoutTemplate size={24} />
        </div>
      </button>

      <button 
        className={styles.iconButton} 
        title="Galeria de Mídias" 
        onClick={() => toggleMenu('gallery')}
        style={activeMenu === 'gallery' ? { color: 'var(--accent-primary)' } : {}}
      >
        <div className={styles.iconWrapper} style={activeMenu === 'gallery' ? { backgroundColor: 'rgba(6, 182, 212, 0.1)' } : {}}>
          <Image size={24} />
        </div>
      </button>

      <button 
        className={styles.iconButton} 
        title="Assistente Criativo IA" 
        onClick={() => toggleMenu('chat')}
        style={activeMenu === 'chat' ? { color: 'var(--accent-primary)' } : {}}
      >
        <div className={styles.iconWrapper} style={activeMenu === 'chat' ? { backgroundColor: 'rgba(6, 182, 212, 0.1)' } : {}}>
          <MessageSquare size={24} />
        </div>
      </button>

      <button 
        className={styles.iconButton} 
        title="Configurações Globais" 
        onClick={() => toggleMenu('settings')}
        style={activeMenu === 'settings' ? { color: 'var(--accent-primary)' } : {}}
      >
        <div className={styles.iconWrapper} style={activeMenu === 'settings' ? { backgroundColor: 'rgba(6, 182, 212, 0.1)' } : {}}>
          <Settings size={24} />
        </div>
      </button>

      <button 
        className={styles.iconButton} 
        title="Visualizar JSON" 
        onClick={() => toggleMenu('json')}
        style={activeMenu === 'json' ? { color: 'var(--accent-primary)' } : {}}
      >
        <div className={styles.iconWrapper} style={activeMenu === 'json' ? { backgroundColor: 'rgba(6, 182, 212, 0.1)' } : {}}>
          <Code size={24} />
        </div>
      </button>

      <button 
        className={styles.iconButton} 
        title="Gerar Vídeo" 
        onClick={() => setRenderModalOpen(true)}
        style={{ color: '#10b981' }}
      >
        <div className={styles.iconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
          <Play size={24} />
        </div>
      </button>

      <div className={styles.spacer} />

      <button className={styles.iconButton} title="Importar JSON" onClick={handleImportClick}>
        <div className={styles.iconWrapper}>
          <Upload size={24} />
        </div>
      </button>
      <input 
        type="file" 
        accept=".json" 
        style={{ display: 'none' }} 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />

      <button className={styles.iconButton} title="Exportar JSON" onClick={handleExportJson}>
        <div className={styles.iconWrapper}>
          <Download size={24} />
        </div>
      </button>
    </aside>
  );
};

export default Sidebar;
