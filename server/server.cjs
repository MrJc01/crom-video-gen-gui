const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { spawn, exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// Paths
const GUI_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(GUI_ROOT, '..');
const CROM_DIR = path.join(REPO_ROOT, 'crom-video-gen');
const TEMPLATES_DIR = path.join(CROM_DIR, 'templates');
const ASSETS_DIR = path.join(CROM_DIR, 'assets');
const METADATA_FILE = path.join(ASSETS_DIR, 'assets_metadata.json');
const BIN_PATH = path.join(CROM_DIR, 'crom_bin');
const OUTPUT_DIR = path.join(GUI_ROOT, 'output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Multer disk storage for dynamic asset uploads (auto categorizing by mimetype)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mime = file.mimetype;
    let subDir = 'outros';
    if (mime.startsWith('image/')) subDir = 'img';
    else if (mime.startsWith('video/')) subDir = 'video';
    else if (mime.startsWith('audio/')) subDir = 'audio';

    const uploadPath = path.join(ASSETS_DIR, subDir);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const cleanBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${cleanBaseName}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve assets folder relative to sub-templates to handle iframe relative resolution
app.use('/templates/:templateId/assets', express.static(ASSETS_DIR));

// Serve static directories
app.use('/templates', express.static(TEMPLATES_DIR));
app.use('/assets', express.static(ASSETS_DIR));
app.use('/output', express.static(OUTPUT_DIR));

// In-memory jobs tracking
const activeJobs = new Map();

// Helper to check extensions
const getMediaType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) return 'imagens';
  if (['.mp4', '.webm', '.avi', '.mov'].includes(ext)) return 'videos';
  if (['.mp3', '.wav', '.ogg', '.aac', '.m4a'].includes(ext)) return 'audios';
  return 'outros';
};

// Route: Upload asset
app.post('/api/assets/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const fullPath = req.file.path;
  const relativePath = path.relative(CROM_DIR, fullPath);

  res.json({
    success: true,
    caminho: relativePath,
    url: `/${relativePath}`
  });
});

// Route: Get templates list and schemas
app.get('/api/templates', (req, res) => {
  try {
    if (!fs.existsSync(TEMPLATES_DIR)) {
      return res.status(404).json({ error: 'Templates directory not found' });
    }

    const folders = fs.readdirSync(TEMPLATES_DIR);
    const templates = [];

    folders.forEach(folder => {
      const folderPath = path.join(TEMPLATES_DIR, folder);
      if (!fs.statSync(folderPath).isDirectory()) return;

      const schemaPath = path.join(folderPath, 'schema.json');
      let schema = { ativos: {}, parametros: {} };

      if (fs.existsSync(schemaPath)) {
        try {
          schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        } catch (e) {
          console.error(`Error parsing schema for template ${folder}:`, e.message);
        }
      }

      templates.push({
        id: folder,
        schema
      });
    });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route: Get assets recursive list
app.get('/api/assets', (req, res) => {
  try {
    if (!fs.existsSync(ASSETS_DIR)) {
      return res.status(404).json({ error: 'Assets directory not found' });
    }

    const metadata = readMetadata();
    const assets = {
      imagens: [],
      videos: [],
      audios: [],
      outros: []
    };

    const scanDirectory = (dir, prefix = 'assets') => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const relativePath = path.join(prefix, file);

        if (fs.statSync(filePath).isDirectory()) {
          scanDirectory(filePath, relativePath);
        } else {
          // Exclude the metadata store itself from scanning
          if (file === 'assets_metadata.json') return;

          const type = getMediaType(file);
          assets[type].push({
            nome: file,
            caminho: relativePath,
            url: `/${relativePath}`,
            descricao: metadata[relativePath] || ''
          });
        }
      });
    };

    scanDirectory(ASSETS_DIR);
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route: Validate project JSON structure
app.post('/api/validate', (req, res) => {
  const projectConfig = req.body;
  const tempFile = path.join(OUTPUT_DIR, `validate_${Date.now()}.json`);

  try {
    fs.writeFileSync(tempFile, JSON.stringify(projectConfig, null, 2), 'utf8');

    // Run crom_bin validation
    const cmd = `"${BIN_PATH}" -config "${tempFile}" -validate-only`;
    exec(cmd, { cwd: CROM_DIR }, (error, stdout, stderr) => {
      // Clean temp file
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

      if (error) {
        return res.json({
          valid: false,
          error: stderr || stdout || error.message
        });
      }

      res.json({
        valid: true,
        message: 'JSON structure and assets verified successfully.'
      });
    });
  } catch (e) {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    res.status(500).json({ valid: false, error: e.message });
  }
});

// Route: Generate TTS file for preview
app.post('/api/tts/generate', (req, res) => {
  const { texto, voz } = req.body;
  if (!texto) {
    return res.status(400).json({ error: 'Text is required for TTS' });
  }

  const voice = voz || 'pt-BR-FranciscaNeural';
  const outputFilename = `tts_${Date.now()}.mp3`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);
  const edgeTtsPath = '/home/j/.local/bin/edge-tts';

  const cmd = `"${edgeTtsPath}" --voice "${voice}" --text "${texto}" --write-media "${outputPath}"`;
  
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('Edge-TTS error:', stderr || error.message);
      return res.status(500).json({ error: `Failed to generate voice: ${stderr || error.message}` });
    }

    res.json({
      success: true,
      audioUrl: `/output/${outputFilename}`,
      filename: outputFilename
    });
  });
});

// Route: Start video rendering process
app.post('/api/generate', (req, res) => {
  const { project, ttsProvider = 'edge-tts', concurrency = 0, verbose = false } = req.body;
  
  if (!project) {
    return res.status(400).json({ error: 'Project configuration is required' });
  }

  const jobId = `job_${Date.now()}`;
  const tempFile = path.join(OUTPUT_DIR, `${jobId}_config.json`);
  const outputFilename = `${jobId}_output.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  try {
    // Write full wrapped JSON to temporary config
    fs.writeFileSync(tempFile, JSON.stringify({ projeto: project }, null, 2), 'utf8');

    // Prepare arguments
    const args = [
      '-config', tempFile,
      '-output', outputPath,
      '-tts-provider', ttsProvider
    ];

    if (concurrency > 0) {
      args.push('-concurrency', concurrency.toString());
    }

    if (verbose) {
      args.push('-verbose');
    }

    console.log(`Starting job ${jobId}: ${BIN_PATH} ${args.join(' ')}`);

    const child = spawn(BIN_PATH, args, { cwd: CROM_DIR });

    const job = {
      id: jobId,
      child,
      logs: [],
      status: 'running',
      outputUrl: null,
      tempFile,
      outputPath
    };

    activeJobs.set(jobId, job);

    child.stdout.on('data', (data) => {
      const text = data.toString();
      job.logs.push(text);
      console.log(`[Job ${jobId} STDOUT]: ${text.trim()}`);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      job.logs.push(text);
      console.log(`[Job ${jobId} STDERR]: ${text.trim()}`);
    });

    child.on('close', (code) => {
      job.status = code === 0 ? 'completed' : 'failed';
      job.outputUrl = code === 0 ? `/output/${outputFilename}` : null;
      console.log(`Job ${jobId} exited with code ${code}. Status is ${job.status}`);

      // Clean up temporary config file
      if (fs.existsSync(tempFile)) {
        fs.unlink(tempFile, (err) => {
          if (err) console.error(`Error deleting temp file ${tempFile}:`, err);
        });
      }
    });

    res.json({ jobId, status: 'running' });
  } catch (error) {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    res.status(500).json({ error: error.message });
  }
});

// Route: Stream rendering logs (SSE)
app.get('/api/generate/progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Set up EventSource SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Write existing logs immediately
  job.logs.forEach(log => {
    res.write(`data: ${JSON.stringify({ log })}\n\n`);
  });

  // Listeners for stdout/stderr
  const onData = (data) => {
    res.write(`data: ${JSON.stringify({ log: data.toString() })}\n\n`);
  };

  job.child.stdout.on('data', onData);
  job.child.stderr.on('data', onData);

  // Monitor process termination
  const onClose = (code) => {
    let finalStatus = job.status;
    if (finalStatus === 'running') {
      finalStatus = code === 0 ? 'completed' : 'failed';
    }
    res.write(`data: ${JSON.stringify({ 
      status: finalStatus, 
      exitCode: code,
      outputUrl: finalStatus === 'completed' ? `/output/${job.id}_output.mp4` : null 
    })}\n\n`);
    res.end();
  };

  job.child.on('close', onClose);

  // Clean up listeners on client disconnect
  req.on('close', () => {
    if (job.status === 'running') {
      // Keep running in background, just remove SSE listeners
      job.child.stdout.removeListener('data', onData);
      job.child.stderr.removeListener('data', onData);
      job.child.removeListener('close', onClose);
    }
  });
});

// Route: Cancel running render job
app.post('/api/generate/cancel/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status === 'running') {
    job.child.kill('SIGINT');
    job.status = 'cancelled';
    res.json({ success: true, message: 'Job cancelled successfully.' });
  } else {
    res.json({ success: false, message: `Job is already in ${job.status} state.` });
  }
});

// Metadata storage utilities
function readMetadata() {
  if (!fs.existsSync(METADATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading metadata file:', e.message);
    return {};
  }
}

function writeMetadata(metadata) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error writing metadata file:', e.message);
    return false;
  }
}

// Route: Get media-metadata descriptions
app.get('/api/media-metadata', (req, res) => {
  res.json(readMetadata());
});

// Route: Save media-metadata descriptions
app.post('/api/media-metadata', (req, res) => {
  const metadata = req.body;
  if (!metadata || typeof metadata !== 'object') {
    return res.status(400).json({ error: 'Formato de metadados inválido.' });
  }
  const success = writeMetadata(metadata);
  if (success) {
    res.json({ success: true, message: 'Metadados salvos com sucesso.' });
  } else {
    res.status(500).json({ error: 'Falha ao salvar metadados no servidor.' });
  }
});

// Route: AI Chat Agent integration using the modular SDK
app.post('/api/chat/agent', async (req, res) => {
  const apiKey = req.headers['x-openrouter-key'];
  const { prompt, project, selectedSceneId, history, model, feedback } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'Chave de API do OpenRouter ausente (x-openrouter-key).' });
  }
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt é obrigatório.' });
  }
  if (!project) {
    return res.status(400).json({ error: 'Configuração do projeto é obrigatória.' });
  }

  try {
    // Dynamically load the SDK from dist
    const sdkPath = path.resolve(__dirname, '../../crom-video-gen-sdk/dist/index.js');
    const { RouterAgent } = await import(`file://${sdkPath}`);

    const metadata = readMetadata();
    
    // Scan all media to pass to the SDK agent
    const mediaList = [];
    const scanMedia = (dir, prefix = 'assets') => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const relativePath = path.join(prefix, file);
        if (fs.statSync(filePath).isDirectory()) {
          scanMedia(filePath, relativePath);
        } else {
          if (file === 'assets_metadata.json') return;
          mediaList.push({
            nome: file,
            caminho: relativePath,
            url: `/${relativePath}`,
            descricao: metadata[relativePath] || ''
          });
        }
      });
    };
    scanMedia(ASSETS_DIR);

    // Setup RouterAgent
    const routerAgent = new RouterAgent({
      apiKey,
      model: model || 'google/gemini-2.5-flash'
    });

    const context = {
      project,
      selectedSceneId: selectedSceneId || null,
      mediaList
    };

    console.log(`[AI Chat] Invoking RouterAgent with prompt: "${prompt}"`);
    const agentResponse = await routerAgent.execute(prompt, context, feedback, history || []);

    res.json(agentResponse);
  } catch (error) {
    console.error('[AI Chat Error]:', error);
    res.status(500).json({ error: error.message || 'Erro interno no processamento do agente.' });
  }
});

// Route: Global error handler
app.use((err, req, res, next) => {
  console.error('Express Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Crom GUI-CLI Express Bridge running on port ${PORT} `);
  console.log(` Templates: ${TEMPLATES_DIR} `);
  console.log(` Assets:    ${ASSETS_DIR} `);
  console.log(` Outputs:   ${OUTPUT_DIR} `);
  console.log(`====================================================`);
});
