const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const TEMP_DIR = path.join(__dirname, 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
    });
    res.json(info);
  } catch (error) {
    console.error('Error fetching info:', error);
    res.status(500).json({ error: 'Failed to fetch video information' });
  }
});

app.get('/api/download/:id', (req, res) => {
  const { id } = req.params;
  const folderPath = path.join(TEMP_DIR, id);

  if (!fs.existsSync(folderPath)) {
    return res.status(404).send('File not found or expired.');
  }

  const files = fs.readdirSync(folderPath);
  if (files.length === 0) {
    return res.status(404).send('File not found.');
  }

  const file = files[0];
  const filePath = path.join(folderPath, file);

  res.download(filePath, file, (err) => {
    if (err) {
      console.error('Error sending file:', err);
    }
    // Delete file and folder after download completes or fails
    try {
      fs.unlinkSync(filePath);
      fs.rmdirSync(folderPath);
    } catch (cleanupErr) {
      console.error('Error cleaning up temp files:', cleanupErr);
    }
  });
});

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.on('start-download', async (data) => {
    const { url, format } = data;
    const downloadId = Math.random().toString(36).substring(7);
    const downloadFolderPath = path.join(TEMP_DIR, downloadId);
    
    fs.mkdirSync(downloadFolderPath, { recursive: true });

    socket.emit('download-started', { id: downloadId, status: 'Starting download to server...' });

    try {
      const options = {
        noWarnings: true,
        noCallHome: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true,
        paths: downloadFolderPath,
        output: '%(title)s.%(ext)s'
      };

      if (format === 'mp3') {
        options.extractAudio = true;
        options.audioFormat = 'mp3';
      } else {
        options.format = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
      }

      const downloader = youtubedl.exec(url, options);

      downloader.stdout.on('data', (data) => {
        const text = data.toString();
        if (text.includes('[download]')) {
           socket.emit('download-progress', { id: downloadId, log: text.trim() });
        }
      });

      downloader.stderr.on('data', (data) => {
         socket.emit('download-error-log', { id: downloadId, log: data.toString() });
      });

      await downloader;
      
      // Auto-delete folder after 10 minutes if not downloaded
      setTimeout(() => {
        if (fs.existsSync(downloadFolderPath)) {
           fs.rmSync(downloadFolderPath, { recursive: true, force: true });
        }
      }, 10 * 60 * 1000);

      socket.emit('download-ready', { id: downloadId });

    } catch (error) {
      console.error('Download error:', error);
      socket.emit('download-error', { id: downloadId, error: 'Download failed' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
