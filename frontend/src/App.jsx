import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Search, Download, Video, Music, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_BASE = 'http://localhost:4000';
const socket = io(API_BASE);

function App() {
  const [url, setUrl] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [error, setError] = useState('');
  const [format, setFormat] = useState('mp4');
  
  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLog, setDownloadLog] = useState('');
  const [downloadStatus, setDownloadStatus] = useState(''); // 'downloading', 'ready', 'error'
  const [readyDownloadId, setReadyDownloadId] = useState(null);

  useEffect(() => {
    socket.on('download-started', (data) => {
      setDownloadStatus('downloading');
      setDownloadLog(data.status);
      setDownloadProgress(0);
      setReadyDownloadId(null);
    });

    socket.on('download-progress', (data) => {
      setDownloadLog(data.log);
      const match = data.log.match(/(\d+\.\d+)%/);
      if (match && match[1]) {
        setDownloadProgress(parseFloat(match[1]));
      }
    });

    socket.on('download-ready', (data) => {
      setDownloadStatus('ready');
      setIsDownloading(false);
      setDownloadProgress(100);
      setDownloadLog('Processing complete! Ready to save.');
      setReadyDownloadId(data.id);
      
      // Auto-trigger browser download
      window.location.href = `${API_BASE}/api/download/${data.id}`;
    });

    socket.on('download-error', (data) => {
      setDownloadStatus('error');
      setIsDownloading(false);
      setDownloadLog(data.error);
    });

    return () => {
      socket.off('download-started');
      socket.off('download-progress');
      socket.off('download-ready');
      socket.off('download-error');
    };
  }, []);

  const handleFetchInfo = async (e) => {
    e.preventDefault();
    if (!url) return;

    setIsLoadingInfo(true);
    setError('');
    setVideoInfo(null);
    setDownloadStatus('');
    setIsDownloading(false);
    setReadyDownloadId(null);

    try {
      const res = await fetch(`${API_BASE}/api/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch info');
      }
      
      setVideoInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleDownload = () => {
    if (!videoInfo) return;
    setIsDownloading(true);
    socket.emit('start-download', { url: videoInfo.webpage_url || url, format });
  };

  return (
    <div className="app-container">
      <div className="glass-panel">
        <header className="header">
          <h1>GravTube</h1>
          <p>Premium YouTube Series & Video Downloader</p>
        </header>

        <form className="input-group" onSubmit={handleFetchInfo}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Paste YouTube Video or Playlist URL here..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className="btn" disabled={isLoadingInfo || !url}>
            {isLoadingInfo ? <div className="loader"></div> : <><Search size={20} /> Fetch</>}
          </button>
        </form>

        {error && (
          <div style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {videoInfo && (
          <div className="info-card">
            <div className="thumbnail-container">
              <img src={videoInfo.thumbnail} alt={videoInfo.title} />
            </div>
            
            <div className="video-details">
              <h2 className="video-title">{videoInfo.title}</h2>
              <div className="video-meta">
                <span>{videoInfo.uploader}</span>
                <span>•</span>
                <span>{videoInfo.duration_string || (videoInfo.duration ? Math.floor(videoInfo.duration / 60) + ':' + (videoInfo.duration % 60).toString().padStart(2, '0') : 'N/A')}</span>
                {videoInfo._type === 'playlist' && (
                  <>
                    <span>•</span>
                    <span>Playlist: {videoInfo.playlist_count} videos</span>
                  </>
                )}
              </div>

              <div className="format-selection">
                <button 
                  className={`format-btn ${format === 'mp4' ? 'active' : ''}`}
                  onClick={() => setFormat('mp4')}
                  disabled={isDownloading}
                >
                  <Video size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                  MP4 Video
                </button>
                <button 
                  className={`format-btn ${format === 'mp3' ? 'active' : ''}`}
                  onClick={() => setFormat('mp3')}
                  disabled={isDownloading}
                >
                  <Music size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                  MP3 Audio
                </button>
              </div>

              <div className="download-controls">
                {downloadStatus === 'ready' && readyDownloadId ? (
                  <a 
                    href={`${API_BASE}/api/download/${readyDownloadId}`} 
                    className="btn" 
                    style={{ width: '100%', justifyContent: 'center', backgroundColor: 'var(--success)', textDecoration: 'none' }}
                  >
                    <CheckCircle2 size={20} /> Save to Device
                  </a>
                ) : (
                  <button 
                    className="btn" 
                    onClick={handleDownload} 
                    disabled={isDownloading}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {isDownloading ? (
                      'Processing on Server...'
                    ) : (
                      <><Download size={20} /> Download {format.toUpperCase()}</>
                    )}
                  </button>
                )}
              </div>

              {(isDownloading || downloadStatus) && (
                <div className="progress-container">
                  <div className="progress-header">
                    <span>{downloadStatus === 'error' ? 'Error' : 'Server Progress'}</span>
                    <span>{Math.round(downloadProgress)}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${downloadProgress}%`,
                        background: downloadStatus === 'error' ? 'var(--error)' : downloadStatus === 'ready' ? 'var(--success)' : ''
                      }}
                    ></div>
                  </div>
                  <div className="log-text">{downloadLog}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
