export interface GlobalSettings {
  resolucao: string;
  fps: number;
  formato_saida: string;
  audio: {
    sample_rate: number;
    bitrate: string;
    canais: number;
    codec: string;
    normalizar_volume: boolean;
  };
}

export interface Soundtrack {
  arquivo: string;
  volume: number;
  loop: boolean;
}

export interface TemplateData {
  id: string;
  parametros: Record<string, any>;
}

export interface Asset {
  tipo: 'imagem' | 'video';
  caminho: string;
}

export interface Narration {
  texto: string;
  voz: string;
  rate?: string;
  pitch?: string;
  volume?: string;
}

export interface Scene {
  id: number;
  template: TemplateData;
  ativos: Record<string, Asset>;
  narracao: Narration;
}

export interface ProjectConfig {
  titulo: string;
  configuracoes_globais: GlobalSettings;
  trilha_sonora: Soundtrack;
  cenas: Scene[];
}

export interface TemplateSchemaAsset {
  obrigatorio: boolean;
  tipos_permitidos: string[];
}

export interface TemplateSchemaParam {
  obrigatorio: boolean;
  tipo: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'color';
  default?: any;
}

export interface TemplateSchema {
  ativos: Record<string, TemplateSchemaAsset>;
  parametros: Record<string, TemplateSchemaParam>;
}
