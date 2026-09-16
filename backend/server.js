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

const PORT = 4000;
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Endpoint to get video or playlist info
app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

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

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.on('start-download', async (data) => {
    const { url, format, customPath } = data;
    const downloadId = Math.random().toString(36).substring(7);

    socket.emit('download-started', { id: downloadId, status: 'Starting download...' });

    try {
      const targetDir = customPath || DOWNLOAD_DIR;
      
      // Ensure custom directory exists if provided, fallback to DOWNLOAD_DIR if it fails
      let finalDir = targetDir;
      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
      } catch (err) {
        console.error('Error creating custom path:', err);
        finalDir = DOWNLOAD_DIR;
      }

      const options = {
        noWarnings: true,
        noCallHome: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true,
        paths: finalDir,
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
        // Try to parse yt-dlp progress string (e.g. "[download]  25.0% of 10.00MiB at 1.00MiB/s ETA 00:05")
        if (text.includes('[download]')) {
           socket.emit('download-progress', { id: downloadId, log: text.trim() });
        }
      });

      downloader.stderr.on('data', (data) => {
         socket.emit('download-error-log', { id: downloadId, log: data.toString() });
      });

      await downloader;
      socket.emit('download-complete', { id: downloadId });

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
  console.log(`Backend server running on http://localhost:${PORT}`);
});
