import type { TemplateSchema } from '../types';

export const TEMPLATE_SCHEMAS: Record<string, TemplateSchema> = {
  intro_branding: {
    ativos: {
      media0: { obrigatorio: true, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      zoom_speed: { obrigatorio: false, tipo: "number", default: 1.1 },
      overlay_opacity: { obrigatorio: false, tipo: "number", default: 0.4 },
      text0: { obrigatorio: false, tipo: "string" },
      text1: { obrigatorio: false, tipo: "string" }
    }
  },
  cinematic_video: {
    ativos: {
      media0: { obrigatorio: true, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      blur_amount: { obrigatorio: false, tipo: "number", default: 0 },
      color_grading: { obrigatorio: false, tipo: "string" }
    }
  },
  technical_specs: {
    ativos: {
      media0: { obrigatorio: true, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      highlight_color: { obrigatorio: false, tipo: "color", default: "#ffaa00" },
      list_style: { obrigatorio: false, tipo: "string", default: "bullets" },
      specs: { obrigatorio: false, tipo: "array", default: [] },
      specs_title: { obrigatorio: false, tipo: "string" },
      specs_tag: { obrigatorio: false, tipo: "string" }
    }
  },
  split_screen_demo: {
    ativos: {
      media0: { obrigatorio: true, tipos_permitidos: ["imagem", "video"] },
      media1: { obrigatorio: false, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      divider_pos: { obrigatorio: false, tipo: "number", default: 0.5 },
      border_width: { obrigatorio: false, tipo: "number", default: 2 },
      text0: { obrigatorio: false, tipo: "string" },
      text1: { obrigatorio: false, tipo: "string" }
    }
  },
  highlight_focus: {
    ativos: {
      media0: { obrigatorio: true, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      focus_area: { obrigatorio: false, tipo: "string", default: "center" },
      darken_bg: { obrigatorio: false, tipo: "boolean", default: true }
    }
  },
  action_video_fast: {
    ativos: {
      media0: { obrigatorio: true, tipos_permitidos: ["video"] }
    },
    parametros: {
      playback_speed: { obrigatorio: false, tipo: "number", default: 1.5 },
      motion_blur: { obrigatorio: false, tipo: "boolean", default: true }
    }
  },
  quote_testimonial: {
    ativos: {
      media0: { obrigatorio: true, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      quote_text: { obrigatorio: true, tipo: "string", default: "Sua citação aqui" },
      quote_author: { obrigatorio: false, tipo: "string" },
      accent_color: { obrigatorio: false, tipo: "color", default: "#00ffcc" }
    }
  },
  dashboard_kpi: {
    ativos: {
      media0: { obrigatorio: true, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      metric_value: { obrigatorio: true, tipo: "string", default: "100%" },
      metric_label: { obrigatorio: true, tipo: "string", default: "Métrica" },
      progress_percentage: { obrigatorio: false, tipo: "number", default: 100 },
      accent_color: { obrigatorio: false, tipo: "color", default: "#ffaa00" }
    }
  },
  process_steps: {
    ativos: {
      media0: { obrigatorio: true, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      steps: { obrigatorio: true, tipo: "array", default: ["Passo 1", "Passo 2"] },
      accent_color: { obrigatorio: false, tipo: "color", default: "#00ffcc" }
    }
  },
  code_snippet_typing: {
    ativos: {
      media0: { obrigatorio: false, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      language: { obrigatorio: false, tipo: "string", default: "javascript" },
      theme: { obrigatorio: false, tipo: "string", default: "dracula" },
      typing_speed: { obrigatorio: false, tipo: "string", default: "fast" },
      show_line_numbers: { obrigatorio: false, tipo: "boolean", default: true },
      code_text: { obrigatorio: true, tipo: "string", default: "console.log('Hello');" }
    }
  },
  concept_definition: {
    ativos: {
      media0: { obrigatorio: false, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      term: { obrigatorio: true, tipo: "string", default: "Termo" },
      phonetic_spelling: { obrigatorio: false, tipo: "string" },
      definition: { obrigatorio: true, tipo: "string", default: "Definição do termo." },
      accent_color: { obrigatorio: false, tipo: "color", default: "#ffaa00" }
    }
  },
  comparison_matrix: {
    ativos: {
      media0: { obrigatorio: false, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      title: { obrigatorio: true, tipo: "string", default: "Comparação" },
      column_a: { obrigatorio: true, tipo: "object", default: { header: "A", points: [] } },
      column_b: { obrigatorio: true, tipo: "object", default: { header: "B", points: [] } },
      highlight_winner: { obrigatorio: false, tipo: "string", default: "column_b" }
    }
  },
  q_and_a_flashcard: {
    ativos: {
      media0: { obrigatorio: false, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      question: { obrigatorio: true, tipo: "string", default: "Pergunta?" },
      answer: { obrigatorio: true, tipo: "string", default: "Resposta." },
      flip_animation: { obrigatorio: false, tipo: "boolean", default: true },
      timer_bar: { obrigatorio: false, tipo: "number", default: 3.0 },
      footer_front: { obrigatorio: false, tipo: "string" },
      footer_back: { obrigatorio: false, tipo: "string" }
    }
  },
  roadmap_timeline: {
    ativos: {
      media0: { obrigatorio: false, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      orientation: { obrigatorio: false, tipo: "string", default: "horizontal" },
      current_step_index: { obrigatorio: true, tipo: "number", default: 0 },
      milestones: { obrigatorio: true, tipo: "array", default: ["Q1", "Q2", "Q3"] },
      completed_color: { obrigatorio: false, tipo: "color", default: "#00ffcc" },
      pending_color: { obrigatorio: false, tipo: "color", default: "#555555" }
    }
  },
  outro_credits: {
    ativos: {
      media0: { obrigatorio: true, tipos_permitidos: ["imagem", "video"] }
    },
    parametros: {
      fade_out_duration: { obrigatorio: false, tipo: "number", default: 3.0 },
      show_qr_code: { obrigatorio: false, tipo: "boolean", default: false },
      text0: { obrigatorio: false, tipo: "string", default: "Obrigado" },
      cta_title: { obrigatorio: false, tipo: "string" },
      github_handle: { obrigatorio: false, tipo: "string" },
      discord_handle: { obrigatorio: false, tipo: "string" }
    }
  }
};
