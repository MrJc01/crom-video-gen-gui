import React, { useEffect } from 'react';
import { useEditorStore, estimateSceneDuration } from '../store';
import { Play, Pause, RotateCcw, Plus, Trash2, Copy, ArrowLeft, ArrowRight } from 'lucide-react';
import { validateScene } from '../utils/validation';
import styles from './Timeline.module.css';

const Timeline: React.FC = () => {
  const project = useEditorStore((state) => state.project);
  const selectedSceneId = useEditorStore((state) => state.selectedSceneId);
  const selectScene = useEditorStore((state) => state.selectScene);
  const addScene = useEditorStore((state) => state.addScene);
  const removeScene = useEditorStore((state) => state.removeScene);
  const duplicateScene = useEditorStore((state) => state.duplicateScene);
  const reorderScenes = useEditorStore((state) => state.reorderScenes);
  const activeTemplateSchemas = useEditorStore((state) => state.activeTemplateSchemas);
  
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const currentTime = useEditorStore((state) => state.currentTime);
  const setPlaying = useEditorStore((state) => state.setPlaying);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);

  const currentScene = project.cenas.find(c => c.id === selectedSceneId);
  const currentSceneIdx = project.cenas.findIndex(c => c.id === selectedSceneId);
  const currentDuration = currentScene ? estimateSceneDuration(currentScene) : 5.0;

  // Handle automatic playback progression loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let frameId: number;

    const tick = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      
      const newTime = currentTime + delta;
      
      if (newTime >= currentDuration) {
        if (currentSceneIdx < project.cenas.length - 1) {
          // Progress to next scene
          const nextScene = project.cenas[currentSceneIdx + 1];
          selectScene(nextScene.id);
          setCurrentTime(0);
        } else {
          // End of project: pause and hold playhead at end
          setPlaying(false);
          setCurrentTime(currentDuration);
        }
      } else {
        setCurrentTime(newTime);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, currentTime, currentDuration, currentSceneIdx, project.cenas, selectScene, setCurrentTime, setPlaying]);

  const handleAddScene = () => {
    addScene({
      id: 0,
      template: {
        id: 'intro_branding',
        parametros: { zoom_speed: 1.1, overlay_opacity: 0.4, text0: 'Nova Cena' }
      },
      ativos: { media0: { tipo: 'imagem', caminho: 'assets/img/capa_projeto.jpg' } },
      narracao: { texto: 'Nova cena adicionada.', voz: 'pt-BR-FranciscaNeural' }
    });
  };

  const handleRemoveScene = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (project.cenas.length <= 1) {
      alert('O projeto precisa ter pelo menos uma cena.');
      return;
    }
    if (confirm('Deseja excluir esta cena?')) {
      removeScene(id);
    }
  };

  const handleDuplicateScene = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    duplicateScene(id);
  };

  const handleMoveLeft = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (idx > 0) reorderScenes(idx, idx - 1);
  };

  const handleMoveRight = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (idx < project.cenas.length - 1) reorderScenes(idx, idx + 1);
  };

  return (
    <div className={styles.timeline}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          Linha do Tempo ({project.cenas.length} Cenas)
        </h3>
        
        {/* Playback controller overlay */}
        <div className={styles.playbackControls}>
          <button 
            className={styles.controlBtn} 
            title="Voltar ao início"
            onClick={() => { setPlaying(false); setCurrentTime(0); }}
          >
            <RotateCcw size={16} />
          </button>
          
          <button 
            className={`${styles.controlBtn} ${isPlaying ? styles.isPlaying : ''}`} 
            title={isPlaying ? 'Pause' : 'Play'}
            onClick={() => setPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <span className={styles.timeLabel}>
            {currentTime.toFixed(1)}s / {currentDuration.toFixed(1)}s
          </span>

          <input 
            type="range"
            min={0}
            max={currentDuration}
            step={0.05}
            value={currentTime}
            onChange={(e) => {
              setPlaying(false);
              setCurrentTime(parseFloat(e.target.value));
            }}
            className={styles.timeSlider}
          />
        </div>
      </div>
      
      <div className={styles.scrollArea}>
        {project.cenas.map((scene, index) => {
          const isSelected = selectedSceneId === scene.id;
          const duration = estimateSceneDuration(scene);
          const customSchema = activeTemplateSchemas[scene.template.id];
          const sceneErrors = validateScene(scene, customSchema);
          const hasErrors = sceneErrors.length > 0;
          
          return (
            <div 
              key={scene.id}
              onClick={() => selectScene(scene.id)}
              className={`${styles.sceneCard} ${isSelected ? styles.selected : ''}`}
            >
              <div className={styles.cardPreview}>
                {hasErrors && (
                  <div 
                    className={styles.warningIndicator} 
                    title={`Esta cena possui ${sceneErrors.length} campo(s) pendente(s):\n${sceneErrors.map(e => `- ${e.message}`).join('\n')}`}
                  >
                    !
                  </div>
                )}
                <div className={styles.templateName}>
                  {scene.template.id.split('_').join('\n')}
                </div>

                {/* Floating quick actions */}
                <div className={styles.cardActions}>
                  <button 
                    onClick={(e) => handleMoveLeft(e, index)}
                    disabled={index === 0}
                    className={styles.actionBtn}
                    title="Mover para esquerda"
                  >
                    <ArrowLeft size={12} />
                  </button>
                  <button 
                    onClick={(e) => handleMoveRight(e, index)}
                    disabled={index === project.cenas.length - 1}
                    className={styles.actionBtn}
                    title="Mover para direita"
                  >
                    <ArrowRight size={12} />
                  </button>
                  <button 
                    onClick={(e) => handleDuplicateScene(e, scene.id)}
                    className={styles.actionBtn}
                    title="Duplicar cena"
                  >
                    <Copy size={12} />
                  </button>
                  <button 
                    onClick={(e) => handleRemoveScene(e, scene.id)}
                    className={`${styles.actionBtn} ${styles.danger}`}
                    title="Excluir cena"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              
              <div className={styles.cardFooter}>
                <span className={styles.sceneIndex}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.sceneDuration}>{duration.toFixed(1)}s</span>
              </div>
            </div>
          );
        })}
        
        <button 
          onClick={handleAddScene}
          className={styles.addButton}
        >
          <Plus size={28} className={styles.addIcon} />
          <span className={styles.addText}>Nova Cena</span>
        </button>
      </div>
    </div>
  );
};

export default Timeline;
