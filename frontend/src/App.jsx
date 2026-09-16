import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Search, Download, Video, Music, AlertCircle, CheckCircle2 } from 'lucide-react';

const socket = io('http://localhost:4000');

function App() {
  const [url, setUrl] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [error, setError] = useState('');
  const [format, setFormat] = useState('mp4');
  const [downloadPath, setDownloadPath] = useState('');
  
  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLog, setDownloadLog] = useState('');
  const [downloadStatus, setDownloadStatus] = useState(''); // 'downloading', 'completed', 'error'

  useEffect(() => {
    socket.on('download-started', (data) => {
      setDownloadStatus('downloading');
      setDownloadLog(data.status);
      setDownloadProgress(0);
    });

    socket.on('download-progress', (data) => {
      setDownloadLog(data.log);
      
      // Attempt to extract percentage from yt-dlp log
      // Format: [download]  25.0% of ...
      const match = data.log.match(/(\d+\.\d+)%/);
      if (match && match[1]) {
        setDownloadProgress(parseFloat(match[1]));
      }
    });

    socket.on('download-complete', () => {
      setDownloadStatus('completed');
      setIsDownloading(false);
      setDownloadProgress(100);
      setDownloadLog('Download completed successfully!');
    });

    socket.on('download-error', (data) => {
      setDownloadStatus('error');
      setIsDownloading(false);
      setDownloadLog(data.error);
    });

    return () => {
      socket.off('download-started');
      socket.off('download-progress');
      socket.off('download-complete');
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

    try {
      const res = await fetch('http://localhost:4000/api/info', {
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
    socket.emit('start-download', { url: videoInfo.webpage_url || url, format, customPath: downloadPath });
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

              <div className="format-selection" style={{ flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
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
                
                <input
                  type="text"
                  className="input-field"
                  placeholder="Custom download path (optional, e.g., C:\Downloads)"
                  value={downloadPath}
                  onChange={(e) => setDownloadPath(e.target.value)}
                  disabled={isDownloading}
                  style={{ width: '100%', padding: '0.75rem 1rem', marginTop: '0.5rem' }}
                />
              </div>

              <div className="download-controls">
                <button 
                  className="btn" 
                  onClick={handleDownload} 
                  disabled={isDownloading || downloadStatus === 'completed'}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {isDownloading ? (
                    'Downloading...'
                  ) : downloadStatus === 'completed' ? (
                    <><CheckCircle2 size={20} /> Downloaded</>
                  ) : (
                    <><Download size={20} /> Download {format.toUpperCase()}</>
                  )}
                </button>
              </div>

              {(isDownloading || downloadStatus) && (
                <div className="progress-container">
                  <div className="progress-header">
                    <span>{downloadStatus === 'error' ? 'Error' : 'Progress'}</span>
                    <span>{Math.round(downloadProgress)}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${downloadProgress}%`,
                        background: downloadStatus === 'error' ? 'var(--error)' : downloadStatus === 'completed' ? 'var(--success)' : ''
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
