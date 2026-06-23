import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../store';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import styles from './JsonEditor.module.css';

const JsonEditor: React.FC = () => {
  const project = useEditorStore((state) => state.project);
  const loadProject = useEditorStore((state) => state.loadProject);

  const setRenderModalOpen = useEditorStore((state) => state.setRenderModalOpen);

  const [jsonText, setJsonText] = useState('');
  const [isValidJson, setIsValidJson] = useState(true);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string; message?: string } | null>(null);
  const [validating, setValidating] = useState(false);

  // Initialize and sync text from editor store
  useEffect(() => {
    setJsonText(JSON.stringify({ projeto: project }, null, 2));
    setValidationResult(null);
    setIsValidJson(true);
  }, [project]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);

    // Simple syntax validation
    try {
      JSON.parse(text);
      setIsValidJson(true);
    } catch (err) {
      setIsValidJson(false);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setIsValidJson(true);
    } catch (e) {
      setIsValidJson(false);
    }
  };

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonText);
      // Support both wrapped in { projeto: ... } or raw project configurations
      const projectData = parsed.projeto ? parsed.projeto : parsed;
      loadProject(projectData);
      setValidationResult({ valid: true, message: 'JSON aplicado no editor com sucesso!' });
    } catch (e) {
      setIsValidJson(false);
      setValidationResult({ valid: false, error: 'JSON com erros de sintaxe. Não foi possível aplicar.' });
    }
  };

  const handleDownload = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const dataStr = JSON.stringify(parsed, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${((parsed.projeto?.titulo || parsed.titulo || 'video_project').replace(/\s+/g, '_').toLowerCase())}_config.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('JSON inválido. Corrija o JSON antes de baixar.');
    }
  };

  const handleApplyAndGenerate = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const projectData = parsed.projeto ? parsed.projeto : parsed;
      loadProject(projectData);
      setRenderModalOpen(true);
    } catch (e) {
      setIsValidJson(false);
      setValidationResult({ valid: false, error: 'JSON com erros de sintaxe. Não foi possível aplicar e gerar vídeo.' });
    }
  };

  const handleValidateBackend = async () => {
    if (!isValidJson) return;

    setValidating(true);
    setValidationResult(null);
    try {
      const parsed = JSON.parse(jsonText);
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });

      if (!res.ok) throw new Error('Erro na comunicação com o servidor de validação');

      const data = await res.json();
      setValidationResult(data);
    } catch (err: any) {
      console.error(err);
      setValidationResult({
        valid: false,
        error: `Falha na Validação: ${err.message}`
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className={styles.jsonEditorContainer}>
      <textarea
        value={jsonText}
        onChange={handleTextChange}
        className={`${styles.editorArea} ${!isValidJson ? styles.errorTextarea : ''}`}
        placeholder="Insira as configurações JSON aqui..."
        spellCheck="false"
      />

      {validationResult && (
        <div className={`${styles.validationStatus} ${validationResult.valid ? styles.statusSuccess : styles.statusError}`}>
          {validationResult.valid ? (
            <>
              <CheckCircle size={16} />
              <span>{validationResult.message}</span>
            </>
          ) : (
            <>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{validationResult.error}</span>
            </>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <button 
          onClick={handleFormat} 
          className={`${styles.btn} ${styles.btnSecondary}`}
          title="Pretty format JSON structure"
        >
          Formatar
        </button>

        <button 
          onClick={handleValidateBackend} 
          disabled={!isValidJson || validating}
          className={`${styles.btn} ${styles.btnSecondary}`}
        >
          {validating ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : 'Validar (Go Engine)'}
        </button>

        <button 
          onClick={handleDownload}
          disabled={!isValidJson}
          className={`${styles.btn} ${styles.btnSecondary}`}
          title="Download JSON config file"
        >
          Baixar JSON
        </button>

        <button 
          onClick={handleApply} 
          disabled={!isValidJson}
          className={`${styles.btn} ${styles.btnSecondary}`}
        >
          Aplicar
        </button>

        <button 
          onClick={handleApplyAndGenerate} 
          disabled={!isValidJson}
          className={`${styles.btn} ${styles.btnPrimary}`}
          title="Apply and open render modal"
        >
          Gerar Vídeo
        </button>
      </div>
    </div>
  );
};

export default JsonEditor;
