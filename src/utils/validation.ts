import type { Scene, ProjectConfig } from '../types';
import { TEMPLATE_SCHEMAS } from '../data/schemas';

export interface ValidationError {
  sceneId?: number;
  field: string; // e.g. "ativos.media0", "parametros.metric_value", "narracao.texto", "global.titulo"
  message: string;
}

/**
 * Validates a single scene against its schema definition
 */
export const validateScene = (scene: Scene, customSchema?: any): ValidationError[] => {
  const errors: ValidationError[] = [];
  const schema = customSchema || TEMPLATE_SCHEMAS[scene.template.id];

  // If the template is unknown
  if (!schema) {
    errors.push({
      sceneId: scene.id,
      field: 'template.id',
      message: `Template desconhecido: "${scene.template.id}"`
    });
    return errors;
  }

  // 1. Validate required visual parameters
  if (schema.parametros) {
    Object.entries(schema.parametros).forEach(([key, def]: [string, any]) => {
      if (def.obrigatorio) {
        const val = scene.template.parametros[key];
        const isEmpty = val === undefined || val === null || val === '';
        const isEmptyArray = Array.isArray(val) && val.length === 0;

        if (isEmpty || isEmptyArray) {
          errors.push({
            sceneId: scene.id,
            field: `parametros.${key}`,
            message: `O parâmetro "${key.replace(/_/g, ' ')}" é obrigatório.`
          });
        }
      }
    });
  }

  // 2. Validate required media assets
  if (schema.ativos) {
    Object.entries(schema.ativos).forEach(([key, def]: [string, any]) => {
      if (def.obrigatorio) {
        const asset = scene.ativos[key];
        if (!asset || !asset.caminho || asset.caminho.trim() === '') {
          errors.push({
            sceneId: scene.id,
            field: `ativos.${key}`,
            message: `O ativo de mídia "${key.replace(/_/g, ' ')}" é obrigatório.`
          });
        }
      }
    });
  }

  // 3. Validate narration text (always required)
  if (!scene.narracao || !scene.narracao.texto || scene.narracao.texto.trim() === '') {
    errors.push({
      sceneId: scene.id,
      field: 'narracao.texto',
      message: 'O texto de narração é obrigatório.'
    });
  }

  return errors;
};

/**
 * Validates a whole project configuration
 */
export const validateProject = (project: ProjectConfig, activeTemplateSchemas: Record<string, any> = {}): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Project title validation
  if (!project.titulo || project.titulo.trim() === '') {
    errors.push({
      field: 'titulo',
      message: 'O título do projeto é obrigatório.'
    });
  }

  // Scene count validation
  if (!project.cenas || project.cenas.length === 0) {
    errors.push({
      field: 'cenas',
      message: 'O projeto deve conter pelo menos uma cena.'
    });
    return errors;
  }

  // Validate each scene
  project.cenas.forEach((scene) => {
    const customSchema = activeTemplateSchemas[scene.template.id];
    const sceneErrors = validateScene(scene, customSchema);
    errors.push(...sceneErrors);
  });

  return errors;
};
