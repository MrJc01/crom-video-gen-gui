import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../store';
import { X, Play, Download } from 'lucide-react';
import styles from './GenerationModal.module.css';

const GenerationModal: React.FC = () => {
  const project = useEditorStore((state) => state.project);
  const isOpen = useEditorStore((state) => state.isRenderModalOpen);
  const setRenderModalOpen = useEditorStore((state) => state.setRenderModalOpen);
  const onClose = () => setRenderModalOpen(false);
  
  const [ttsProvider, setTtsProvider] = useState<'edge-tts' | 'mock'>('edge-tts');
  const [concurrency, setConcurrency] = useState<number>(0);
  const [verbose, setVerbose] = useState<boolean>(false);
  const [showConfigJson, setShowConfigJson] = useState(false);
  
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed' | 'cancelled'>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const finishedScenesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Scroll to bottom of terminal whenever logs update
    if (terminalEndRef.current && typeof terminalEndRef.current.scrollIntoView === 'function') {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Clean up SSE connection on unmount or modal close
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleStartRender = async () => {
    setStatus('running');
    setLogs([]);
    setProgressPercent(0);
    setOutputUrl(null);
    finishedScenesRef.current.clear();
    
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project,
          ttsProvider,
          concurrency,
          verbose
        })
      });

      if (!res.ok) throw new Error('Falha ao iniciar renderização');

      const data = await res.json();
      const job = data.jobId;
      setJobId(job);

      // Connect to SSE log stream
      const es = new EventSource(`/api/generate/progress/${job}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        
        if (payload.log) {
          setLogs(prev => [...prev, payload.log]);

          // Simple progress heuristics parsing Go CLI structured logs
          // e.g. msg="Cena renderizada com sucesso" cena_id=3
          if (payload.log.includes('Cena renderizada com sucesso')) {
            const match = payload.log.match(/cena_id=(\d+)/);
            if (match) {
              const id = parseInt(match[1]);
              finishedScenesRef.current.add(id);
              const computedPercent = Math.min(99, Math.round((finishedScenesRef.current.size / project.cenas.length) * 100));
              setProgressPercent(computedPercent);
            }
          }
        }

        if (payload.status) {
          setStatus(payload.status);
          if (payload.status === 'completed' && payload.outputUrl) {
            setOutputUrl(payload.outputUrl);
            setProgressPercent(100);
          }
          es.close();
        }
      };

      es.onerror = (err) => {
        console.error('SSE Error:', err);
        setLogs(prev => [...prev, '\n[ERRO CONEXÃO]: Conexão com logs encerrada inesperadamente.']);
        setStatus(prev => prev === 'running' ? 'failed' : prev);
        es.close();
      };

    } catch (e: any) {
      console.error(e);
      setStatus('failed');
      setLogs(prev => [...prev, `\n[FALHA INTERNA]: ${e.message}`]);
    }
  };

  const handleCancelRender = async () => {
    if (!jobId) return;

    try {
      const res = await fetch(`/api/generate/cancel/${jobId}`, { method: 'POST' });
      if (res.ok) {
        setStatus('cancelled');
        setLogs(prev => [...prev, '\n[CANCELADO]: Cancelamento disparado pelo usuário.']);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      }
    } catch (e) {
      console.error('Failed to cancel render:', e);
    }
  };

  const handleClose = () => {
    if (status === 'running') {
      if (!confirm('Deseja mesmo cancelar a renderização em execução?')) return;
      handleCancelRender();
    }
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <header className={styles.header}>
          <h2 className={styles.title}>Gerar Vídeo Final (crom-video-gen)</h2>
          <button onClick={handleClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </header>

        <div className={styles.body}>
          {status === 'idle' && (
            <div className={styles.formGroup}>
              <div className={styles.field}>
                <label htmlFor="tts-provider-select" className={styles.label}>Provedor de TTS (Narração)</label>
                <select 
                  id="tts-provider-select"
                  value={ttsProvider} 
                  onChange={(e: any) => setTtsProvider(e.target.value)} 
                  className={styles.select}
                >
                  <option value="edge-tts">Microsoft Edge Neural Voices (Recomendado/Online)</option>
                  <option value="mock">Silencioso (Offline/Para Testes)</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="concurrency-input" className={styles.label}>Workers Paralelos (Concurrency)</label>
                <input 
                  id="concurrency-input"
                  type="number" 
                  min="0"
                  max="16"
                  value={concurrency} 
                  onChange={(e) => setConcurrency(parseInt(e.target.value) || 0)} 
                  className={styles.input}
                  placeholder="0 para automático"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.checkboxContainer}>
                  <input 
                    type="checkbox" 
                    checked={verbose} 
                    onChange={(e) => setVerbose(e.target.checked)} 
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxLabel}>Ativar logs verbosos (Debug)</span>
                </label>
              </div>

              <div className={styles.configSummary}>
                <div className={styles.label}>Especificações de Compilação (Pre-Build Specs)</div>
                <div className={styles.configGrid}>
                  <div className={styles.configItem}>
                    <span className={styles.label}>Projeto</span>
                    <span className={styles.configValue}>{project.titulo}</span>
                  </div>
                  <div className={styles.configItem}>
                    <span className={styles.label}>Cenas</span>
                    <span className={styles.configValue}>{project.cenas.length} cena(s)</span>
                  </div>
                  <div className={styles.configItem}>
                    <span className={styles.label}>Formato & FPS</span>
                    <span className={styles.configValue}>{project.configuracoes_globais.resolucao} @ {project.configuracoes_globais.fps} FPS ({project.configuracoes_globais.formato_saida.toUpperCase()})</span>
                  </div>
                  <div className={styles.configItem}>
                    <span className={styles.label}>Trilha Sonora</span>
                    <span className={styles.configValue}>
                      {project.trilha_sonora.arquivo ? project.trilha_sonora.arquivo.split('/').pop() : 'Sem trilha sonora'}
                    </span>
                  </div>
                </div>
                
                <button 
                  type="button" 
                  onClick={() => setShowConfigJson(!showConfigJson)} 
                  className={styles.jsonToggle}
                >
                  {showConfigJson ? '[-] Ocultar JSON do Pré-Compilador' : '[+] Visualizar JSON do Pré-Compilador'}
                </button>

                {showConfigJson && (
                  <pre className={styles.jsonPreview} data-testid="precompiler-json">
                    {JSON.stringify({ projeto: project }, null, 2)}
                  </pre>
                )}
              </div>

              <button onClick={handleStartRender} className={styles.actionBtn}>
                <Play size={16} style={{ marginRight: 8, display: 'inline', verticalAlign: 'middle' }} />
                Iniciar Renderização
              </button>
            </div>
          )}

          {status === 'running' && (
            <div className={styles.terminalContainer}>
              <div className={styles.progressStats}>
                <span>Processando pipeline...</span>
                <span>{progressPercent}%</span>
              </div>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressBar} style={{ width: `${progressPercent}%` }}></div>
              </div>
              
              <div className={styles.terminal}>
                {logs.map((log, index) => (
                  <div key={index} className={styles.logLine}>{log}</div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              <button onClick={handleCancelRender} className={styles.cancelBtn}>
                Cancelar Renderização
              </button>
            </div>
          )}

          {status === 'completed' && (
            <div className={styles.videoContainer}>
              <div className={styles.progressStats} style={{ color: '#10b981' }}>
                <span>Vídeo Renderizado com Sucesso!</span>
                <span>100%</span>
              </div>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressBar} style={{ width: '100%', backgroundColor: '#10b981' }}></div>
              </div>

              {outputUrl ? (
                <video 
                  controls 
                  src={outputUrl} 
                  className={styles.videoPlayer}
                  autoPlay
                />
              ) : (
                <div className={styles.terminal}>
                  <p>Arquivo renderizado, porém a URL de output não foi resolvida.</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                {outputUrl && (
                  <a 
                    href={outputUrl} 
                    download={`crom_render_${Date.now()}.mp4`}
                    className={styles.downloadLink}
                    style={{ flex: 1, textAlign: 'center' }}
                  >
                    <Download size={16} style={{ marginRight: 8, display: 'inline', verticalAlign: 'middle' }} />
                    Baixar Vídeo MP4
                  </a>
                )}
                <button 
                  onClick={() => setStatus('idle')} 
                  className={styles.actionBtn}
                  style={{ flex: 1 }}
                >
                  Renderizar Novamente
                </button>
              </div>
            </div>
          )}

          {(status === 'failed' || status === 'cancelled') && (
            <div className={styles.terminalContainer}>
              <div className={styles.progressStats} style={{ color: '#ef4444' }}>
                <span>Renderização finalizada com erro.</span>
              </div>
              
              <div className={styles.terminal}>
                {logs.map((log, index) => (
                  <div key={index} className={styles.logLine} style={{ color: '#f87171' }}>{log}</div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              <button 
                onClick={() => setStatus('idle')} 
                className={styles.actionBtn}
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerationModal;
