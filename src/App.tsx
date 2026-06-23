import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import Timeline from './components/Timeline';
import { SidePanels } from './components/SidePanels';
import GenerationModal from './components/GenerationModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { useEditorStore } from './store';
import styles from './App.module.css';

const App: React.FC = () => {
  const fetchSchemas = useEditorStore(state => state.fetchSchemas);

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    fetchSchemas();
  }, [fetchSchemas]);

  return (
    <div className={styles.appContainer}>
      <Sidebar />
      <SidePanels />
      <div className={styles.mainContent}>
        <Canvas />
        <Timeline />
      </div>
      <PropertiesPanel />
      <GenerationModal />
      <ApiKeyModal />
    </div>
  );
};

export default App;
