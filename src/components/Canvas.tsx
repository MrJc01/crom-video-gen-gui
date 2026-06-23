import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore, estimateSceneDuration } from '../store';
import styles from './Canvas.module.css';

const Canvas: React.FC = () => {
  const selectedSceneId = useEditorStore((state) => state.selectedSceneId);
  const project = useEditorStore((state) => state.project);
  const currentTime = useEditorStore((state) => state.currentTime);
  
  const currentScene = project.cenas.find(c => c.id === selectedSceneId);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const duration = currentScene ? estimateSceneDuration(currentScene) : 5.0;

  // Track template ID change to reset iframe loading state
  const templateId = currentScene?.template.id;
  useEffect(() => {
    setIframeLoaded(false);
    setLoadError(false);
  }, [templateId]);

  // Dynamic ResizeObserver to measure the previewArea
  useEffect(() => {
    if (!previewAreaRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(previewAreaRef.current);
    return () => observer.disconnect();
  }, []);

  // Parse project target resolution and aspect ratio
  const resolution = project.configuracoes_globais.resolucao || '1920x1080';
  const [resW, resH] = resolution.split('x').map(Number);
  const targetWidth = resW || 1920;
  const targetHeight = resH || 1080;
  const targetAspectRatio = targetWidth / targetHeight;

  // The template resolution is constantly 1920x1080 in their stylesheet
  const designWidth = 1920;
  const designHeight = 1080;

  // Compute scale and bounds to fit previewArea in both width & height
  const widthToUse = containerSize.width || 800;
  const heightToUse = containerSize.height || 450;

  let boxWidth = widthToUse;
  let boxHeight = widthToUse / targetAspectRatio;

  if (boxHeight > heightToUse) {
    boxHeight = heightToUse;
    boxWidth = heightToUse * targetAspectRatio;
  }

  // Calculate uniform scaling to prevent stretching/compression (espremido/esticado)
  const scale = Math.min(boxWidth / designWidth, boxHeight / designHeight);
  const renderedWidth = designWidth * scale;
  const renderedHeight = designHeight * scale;
  const offsetX = (boxWidth - renderedWidth) / 2;
  const offsetY = (boxHeight - renderedHeight) / 2;



  // Helper to map assets paths to absolute URLs for iframe preview only
  const prepareSceneForIframe = (scene: any) => {
    if (!scene || !scene.ativos) return scene;
    const mappedAtivos = { ...scene.ativos };
    for (const key in mappedAtivos) {
      if (mappedAtivos[key] && typeof mappedAtivos[key].caminho === 'string') {
        let caminho = mappedAtivos[key].caminho;
        // Prepend leading slash to prevent relative resolution in /templates/:id/
        if (caminho.startsWith('assets/') && !caminho.startsWith('/')) {
          caminho = '/' + caminho;
        }
        mappedAtivos[key] = { ...mappedAtivos[key], caminho };
      }
    }
    return { ...scene, ativos: mappedAtivos };
  };

  // Inject data when scene configuration or assets change, or when iframe completes load
  useEffect(() => {
    if (!currentScene || !iframeRef.current || !iframeLoaded) return;

    try {
      const iframeWin = iframeRef.current.contentWindow;
      if (iframeWin && typeof (iframeWin as any).setupTemplate === 'function') {
        const preparedScene = prepareSceneForIframe(currentScene);
        // Inject JSON configuration
        (iframeWin as any).setupTemplate(JSON.stringify(preparedScene));
        // Seek to current time
        (iframeWin as any).seekTo(currentTime, duration);
      }
    } catch (e) {
      console.error('Error injecting scene data to template iframe:', e);
    }
  }, [currentScene, iframeLoaded, currentTime, duration]);


  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setLoadError(false);
    console.log(`Template iframe loaded: ${templateId}`);
  };

  const handleIframeError = () => {
    setLoadError(true);
    console.error(`Failed to load template iframe: ${templateId}`);
  };

  return (
    <div className={styles.canvasContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {project.titulo}
        </h1>
        <div className={styles.settingsBadge}>
          {project.configuracoes_globais.resolucao} • {project.configuracoes_globais.fps} FPS
        </div>
      </header>

      <div className={styles.previewArea} ref={previewAreaRef}>
        <div 
          className={styles.previewBox}
          style={{
            width: `${boxWidth}px`,
            height: `${boxHeight}px`,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {currentScene ? (
            <>
              <div className={styles.templateBadge}>
                {currentScene.template.id}
              </div>
              
              {loadError && (
                <div className={styles.errorState}>
                  <p>Erro ao carregar o template HTML</p>
                  <button 
                    onClick={() => {
                      if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
                    }}
                    className={styles.retryButton}
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}

              <iframe
                ref={iframeRef}
                src={`/templates/${currentScene.template.id}/index.html`}
                className={styles.iframe}
                style={{
                  width: `${designWidth}px`,
                  height: `${designHeight}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: `${offsetY}px`,
                  left: `${offsetX}px`,
                  border: 'none'
                }}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                sandbox="allow-scripts allow-same-origin"
                title="Scene Preview"
              />

              {!iframeLoaded && !loadError && (
                <div className={styles.loadingOverlay}>
                  <div className={styles.spinner}></div>
                  <p>Carregando template...</p>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <span>+</span>
              </div>
              <p>Selecione ou crie uma cena para ver o preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Canvas;
