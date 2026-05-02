import React, { useState, useEffect } from 'react';
import { Search, Play, Monitor, Square, Eraser, Image as ImageIcon, Send, Wifi, WifiOff, Plus, Download, X, Edit2, ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react';
import { sendLiveUpdate, subscribeToLiveUpdates, saveLibraryToCloud, subscribeToLibraryUpdates } from '../services/firebase';
import { Upload, Loader2 } from 'lucide-react';
import './Controller.css';

const Controller = () => {
  const [songs, setSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewSong, setPreviewSong] = useState(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [isWsConnected, setIsWsConnected] = useState(true); // Now uses Firebase Cloud
  const [showImportModal, setShowImportModal] = useState(false);
  const [importQuery, setImportQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualLyrics, setManualLyrics] = useState('');
  const [editingSongId, setEditingSongId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isFullscreenPresenter, setIsFullscreenPresenter] = useState(false);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  
  // Sync library with cloud on load
  useEffect(() => {
    const unsubscribe = subscribeToLibraryUpdates((cloudSongs) => {
      setSongs(cloudSongs);
    });
    return () => unsubscribe();
  }, []);

  // Sync state with cloud on load
  useEffect(() => {
    const unsubscribe = subscribeToLiveUpdates((cloudState) => {
      setLiveState(prev => ({
        ...prev,
        ...cloudState
      }));
      setIsInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Debounced search for suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (importQuery.trim() && !editingSongId) {
        searchSuggestions();
      }
    }, 600); // Wait 600ms after typing
    return () => clearTimeout(timer);
  }, [importQuery, editingSongId]);

  const [liveState, setLiveState] = useState({
    title: "",
    content: "",
    slideIndex: 0,
    type: 'CLEAR',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', // Default
    logoUrl: null
  });

  const BACKGROUNDS = [
    { name: 'Midnight', value: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
    { name: 'Deep Purple', value: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)' },
    { name: 'Royal Blue', value: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' },
    { name: 'Ocean', value: 'linear-gradient(135deg, #164e63 0%, #0891b2 100%)' },
    { name: 'Forest', value: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)' },
    { name: 'Crimson', value: 'linear-gradient(135deg, #450a0a 0%, #991b1b 100%)' }
  ];

  const handleBackgroundChange = (bgValue) => {
    if (!isInitialized) return;
    const newState = { ...liveState, background: bgValue };
    setLiveState(newState);
    sendLiveUpdate(newState);
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (limit to 5MB for Database performance)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Please use an image smaller than 5MB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64String = reader.result;
      let newState;
      if (type === 'backgrounds') {
        newState = { ...liveState, background: `url(${base64String})` };
      } else {
        newState = { ...liveState, logoUrl: base64String };
      }
      setLiveState(newState);
      sendLiveUpdate(newState);
      setIsUploading(false);
      showNotification(`${type.slice(0, -1)} updated successfully!`);
    };

    reader.onerror = (error) => {
      console.error("FileReader Error:", error);
      showNotification("Failed to read file.", "error");
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const nextSlide = () => {
    if (!isInitialized || liveState.type !== 'SLIDE') return;
    const slides = liveState.content.split('\n\n');
    const nextIdx = liveState.slideIndex + 1;
    if (nextIdx < slides.length) {
      const newState = { ...liveState, slideIndex: nextIdx };
      setLiveState(newState);
      sendLiveUpdate(newState);
    }
  };

  const prevSlide = () => {
    if (!isInitialized || liveState.type !== 'SLIDE') return;
    const prevIdx = liveState.slideIndex - 1;
    if (prevIdx >= 0) {
      const newState = { ...liveState, slideIndex: prevIdx };
      setLiveState(newState);
      sendLiveUpdate(newState);
    }
  };

  // Keyboard navigation for Live Slides
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [liveState]);

  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectPreview = (song) => {
    setPreviewSong(song);
    setPreviewSlideIndex(0);
  };

  const goLive = (song = previewSong, slideIndex = previewSlideIndex) => {
    if (!song || !isInitialized) return;
    const newState = {
      ...liveState,
      type: 'SLIDE',
      title: song.title,
      content: song.content,
      slideIndex: slideIndex,
      totalSlides: song.content.split('\n\n').length
    };
    setLiveState(newState);
    sendLiveUpdate(newState);
  };

  const handleControl = (type) => {
    if (!isInitialized) return;
    const newState = { ...liveState, type };
    setLiveState(newState);
    sendLiveUpdate(newState);
  };

  const autoFormatLyrics = (text) => {
    if (!text) return "";
    // Split by stanzas first
    const stanzas = text.split(/\n\s*\n/).filter(s => s.trim() !== "");
    const finalSlides = [];

    stanzas.forEach(stanza => {
      const lines = stanza.split('\n').filter(l => l.trim() !== "");
      // If stanza is too long (more than 4 lines), split it
      for (let i = 0; i < lines.length; i += 4) {
        finalSlides.push(lines.slice(i, i + 4).join('\n'));
      }
    });

    return finalSlides.join('\n\n');
  };

  const fetchWithTimeout = async (resource, options = {}) => {
    const { timeout = 10000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  };

  const searchSuggestions = async () => {
    if (!importQuery) return;
    setIsFetching(true);
    setSuggestions([]);
    try {
      const response = await fetchWithTimeout(`https://api.lyrics.ovh/suggest/${importQuery}`);
      const data = await response.json();
      setSuggestions(data.data || []);
      if (!data.data || data.data.length === 0) {
        setIsManualMode(true);
      }
    } catch (e) {
      console.warn("Search timed out or failed. Manual mode.");
      setIsManualMode(true);
    } finally {
      setIsFetching(false);
    }
  };

  const selectAndFetchLyrics = async (artist, title) => {
    setIsFetching(true);
    try {
      // Use AllOrigins as a public proxy for cloud/tablet compatibility
      const targetUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      
      const response = await fetchWithTimeout(proxyUrl);
      const data = await response.json();
      
      // AllOrigins wraps the response in a 'contents' field as a string
      if (data.contents) {
        const lyricsJson = JSON.parse(data.contents);
        if (lyricsJson.lyrics) {
          const formattedContent = autoFormatLyrics(lyricsJson.lyrics);
          const newSong = {
            id: Date.now(),
            title: title,
            content: formattedContent,
            artist: artist
          };
          const newSongs = [newSong, ...songs];
          setSongs(newSongs);
          saveLibraryToCloud(newSongs);
          setPreviewSong(newSong);
          closeModal();
          return;
        }
      }
      
      // Fallback if not found in cloud proxy
      setIsManualMode(true);
      setImportQuery(title);
    } catch (e) {
      console.error("Cloud fetch failed:", e);
      setIsManualMode(true);
      setImportQuery(title);
    } finally {
      setIsFetching(false);
    }
  };

  const handleManualSave = () => {
    if (!importQuery || !manualLyrics) return;
    const formattedContent = autoFormatLyrics(manualLyrics);
    
    if (editingSongId) {
      // Update existing song
      const updatedSongs = songs.map(s => 
        s.id === editingSongId ? { ...s, title: importQuery, content: formattedContent } : s
      );
      setSongs(updatedSongs);
      saveLibraryToCloud(updatedSongs);
      if (previewSong?.id === editingSongId) {
        setPreviewSong({ ...previewSong, title: importQuery, content: formattedContent });
      }
    } else {
      // Add new song
      const newSong = {
        id: Date.now(),
        title: importQuery,
        content: formattedContent,
        artist: 'Manual'
      };
      const newSongs = [newSong, ...songs];
      setSongs(newSongs);
      saveLibraryToCloud(newSongs);
      setPreviewSong(newSong);
    }
    closeModal();
  };

  const startEditSong = (e, song) => {
    e.stopPropagation();
    setEditingSongId(song.id);
    setImportQuery(song.title);
    setManualLyrics(song.content);
    setIsManualMode(true);
    setShowImportModal(true);
  };

  const closeModal = () => {
    setShowImportModal(false);
    setImportQuery('');
    setSuggestions([]);
    setIsManualMode(false);
    setManualLyrics('');
    setEditingSongId(null);
  };

  const [previewMode, setPreviewMode] = useState('SLIDES'); // SLIDES or LYRICS

  // Auto-scroll to top when selecting a new song
  useEffect(() => {
    const previewPane = document.querySelector('.preview-pane .pane-content');
    if (previewPane) previewPane.scrollTop = 0;
  }, [previewSong]);

  const deleteSong = (e, id) => {
    e.stopPropagation(); // Don't trigger preview
    if (window.confirm("Delete this song?")) {
      const remainingSongs = songs.filter(s => s.id !== id);
      setSongs(remainingSongs);
      saveLibraryToCloud(remainingSongs);
      if (previewSong?.id === id) setPreviewSong(null);
    }
  };

  const previewSlides = previewSong ? previewSong.content.split('\n\n') : [];

  return (
    <div className="controller-container">
      <div className="portrait-warning glass-morphism">
        <Monitor size={48} className="rotate-icon" />
        <h2>Please rotate your device</h2>
        <p>This app is best used in landscape mode.</p>
      </div>
      
      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-morphism animate-fade-in">
            <div className="modal-header">
              <h3>{editingSongId ? 'Edit Song' : (isManualMode ? 'Manual Entry' : 'Search & Add Song')}</h3>
              <button onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {!isManualMode ? (
                <>
                  <div className="search-group">
                    <input 
                      value={importQuery} 
                      onChange={e => setImportQuery(e.target.value)}
                      placeholder="Enter song title..."
                      onKeyDown={e => e.key === 'Enter' && searchSuggestions()}
                    />
                    <button onClick={searchSuggestions} disabled={isFetching}>
                      <Search size={18} />
                    </button>
                  </div>

                  <button className="manual-entry-quick-btn" onClick={() => setIsManualMode(true)}>
                    <Plus size={14} /> Add Song Manually
                  </button>

                  <div className="suggestions-list scrollable">
                    {isFetching && suggestions.length === 0 && <p className="status-text">Searching for songs...</p>}
                    {isFetching && suggestions.length > 0 && <p className="status-text fetching">Fetching lyrics, please wait...</p>}
                    {!isFetching && suggestions.map(item => (
                      <div key={item.id} className="suggestion-item" onClick={() => selectAndFetchLyrics(item.artist.name, item.title)}>
                        <div className="item-info">
                          <span className="item-title">{item.title}</span>
                          <span className="item-artist">{item.artist.name}</span>
                        </div>
                        <Plus size={14} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="manual-form animate-fade-in">
                  <div className="manual-alert">
                    <p>Lyrics not found in database.</p>
                    <button 
                      className="google-search-btn" 
                      onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(importQuery)}+lyrics`, '_blank')}
                    >
                      <Search size={14} /> Search on Google
                    </button>
                  </div>
                  <div className="input-group">
                    <label>Song Title</label>
                    <input 
                      value={importQuery} 
                      onChange={e => setImportQuery(e.target.value)}
                      placeholder="Title..."
                    />
                  </div>
                  <div className="input-group">
                    <label>Lyrics (Tip: Use double Enter for new slides)</label>
                    <textarea 
                      value={manualLyrics}
                      onChange={e => setManualLyrics(e.target.value)}
                      placeholder="Paste lyrics here..."
                      rows={10}
                    />
                  </div>
                  <div className="modal-actions">
                    <button className="secondary-btn" onClick={() => setIsManualMode(false)}>Back to Search</button>
                    <button className="primary-btn" onClick={handleManualSave}>
                      {editingSongId ? 'Update Song' : 'Save Song'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pane 1: Library */}
      <div className="pane library-pane glass-morphism">
        <div className="pane-header">
          <div className="title-row">
            <h3><Search size={18} /> Library</h3>
            <button className="add-btn" onClick={() => setShowImportModal(true)} title="Import Song">
              <Plus size={18} />
            </button>
          </div>
          <input 
            type="text" 
            placeholder="Search songs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="pane-content scrollable">
          {filteredSongs.map(song => (
            <div 
              key={song.id} 
              className={`song-card ${previewSong?.id === song.id ? 'selected' : ''}`}
              onClick={() => handleSelectPreview(song)}
            >
              <div className="song-card-info">
                <h4>{song.title}</h4>
                <p>{song.artist || 'Unknown'}</p>
              </div>
              <div className="card-actions">
                <button className="edit-btn" onClick={(e) => startEditSong(e, song)} title="Edit Song">
                  <Edit2 size={14} />
                </button>
                <button className="delete-btn" onClick={(e) => deleteSong(e, song.id)} title="Delete Song">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pane 2: Preview */}
      <div className="pane preview-pane glass-morphism">
        <div className="pane-header">
          <div className="preview-header-info">
            <h3><Monitor size={18} /> Preview</h3>
            <div className="view-toggle">
              <button 
                className={previewMode === 'SLIDES' ? 'active' : ''} 
                onClick={() => setPreviewMode('SLIDES')}
              >
                Slides
              </button>
              <button 
                className={previewMode === 'LYRICS' ? 'active' : ''} 
                onClick={() => setPreviewMode('LYRICS')}
              >
                Lyrics
              </button>
            </div>
          </div>
          <div className="preview-header-actions">
            <button 
              className={`header-quick-btn ${liveState.type === 'CLEAR' ? 'active' : ''}`}
              onClick={() => handleControl('CLEAR')}
              title="Clear Text"
            >
              <Eraser size={14} /> CLEAR
            </button>
            <button 
              className={`header-quick-btn ${liveState.type === 'LOGO' ? 'active' : ''}`}
              onClick={() => handleControl('LOGO')}
              title="Show Logo"
            >
              <ImageIcon size={14} /> LOGO
            </button>
            {previewSong && (
              <button className="go-live-btn" onClick={() => goLive()}>
                <Send size={16} /> GO LIVE
              </button>
            )}
          </div>
        </div>
        <div className="pane-content scrollable">
          {previewSong ? (
            previewMode === 'SLIDES' ? (
              <div className="preview-slides-grid">
                {previewSlides.map((slide, idx) => (
                  <div 
                    key={idx} 
                    className={`preview-slide ${previewSlideIndex === idx ? 'active' : ''} ${liveState.type === 'SLIDE' && liveState.title === previewSong?.title && liveState.slideIndex === idx ? 'is-live' : ''}`}
                    onClick={() => {
                      setPreviewSlideIndex(idx);
                    }}
                    onDoubleClick={() => goLive(previewSong, idx)}
                  >
                    <span className="slide-num">{idx + 1}</span>
                    {liveState.type === 'SLIDE' && liveState.title === previewSong?.title && liveState.slideIndex === idx && (
                      <span className="live-indicator-badge">LIVE</span>
                    )}
                    <div className="slide-text">{slide}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="full-lyrics-view animate-fade-in">
                <h4>{previewSong.title}</h4>
                <pre>{previewSong.content}</pre>
              </div>
            )
          ) : (
            <div className="empty-state">Select a song to preview</div>
          )}
        </div>
      </div>

      {/* Pane 3: Control */}
      <div className="pane control-pane glass-morphism">
        <div className="pane-header">
          <h3><Play size={18} /> Live Output</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              className="header-quick-btn" 
              onClick={() => setIsFullscreenPresenter(true)}
              title="Fullscreen Presenter Mode"
            >
              <Maximize size={16} /> PRESENTER MODE
            </button>
            <div className="ws-status" title={isWsConnected ? "Connected to Backend" : "Backend Disconnected"}>
              {isWsConnected ? <Wifi size={16} color="#10b981" /> : <WifiOff size={16} color="#f43f5e" />}
            </div>
          </div>
        </div>
        
        <div className="pane-content scrollable">
          <div className="live-output-section">
            <div 
              className="live-preview-box" 
              style={{ 
                background: liveState.background, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
              }}
            >
              {liveState.type === 'SLIDE' ? (
                <div className="live-content">
                  <p>{liveState.content.split('\n\n')[liveState.slideIndex]}</p>
                </div>
              ) : liveState.type === 'LOGO' ? (
                <div className="live-logo-preview">
                  {liveState.logoUrl ? (
                    <img src={liveState.logoUrl} alt="Logo" style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
                  ) : (
                    <span>LOGO</span>
                  )}
                </div>
              ) : (
                <div className="live-placeholder">{liveState.type}</div>
              )}
            </div>
            <div className="live-song-title">
              {liveState.type === 'SLIDE' ? liveState.title : 'OFF-AIR'}
            </div>
            
            {/* Tablet Navigation Controls */}
            {liveState.type === 'SLIDE' && (
              <div className="tablet-nav-controls">
                <button 
                  className="nav-btn" 
                  onClick={prevSlide}
                  disabled={liveState.slideIndex === 0}
                >
                  <ChevronLeft size={24} /> Prev
                </button>
                <div className="slide-counter">
                  {liveState.slideIndex + 1} / {liveState.content.split('\n\n').length}
                </div>
                <button 
                  className="nav-btn" 
                  onClick={nextSlide}
                  disabled={liveState.slideIndex === liveState.content.split('\n\n').length - 1}
                >
                  Next <ChevronRight size={24} />
                </button>
              </div>
            )}
          </div>

          {/* NEW: Live Slides List for instant switching */}
          <div className="live-slides-list">
            {liveState.type === 'SLIDE' && liveState.content.split('\n\n').map((slide, idx) => (
              <div 
                key={idx} 
                className={`live-slide-item ${liveState.slideIndex === idx ? 'active' : ''}`}
                onClick={() => {
                  const newState = { ...liveState, slideIndex: idx };
                  setLiveState(newState);
                  sendLiveUpdate(newState);
                }}
              >
                <span className="idx">{idx + 1}</span>
                <span className="text">{slide.substring(0, 30)}...</span>
              </div>
            ))}
          </div>
          
          {/* Background Picker */}
          <div className="background-picker-section">
            <div className="section-header-row">
              <h4>Backgrounds</h4>
              <label className="upload-label" title="Upload Background">
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'backgrounds')} hidden disabled={isUploading} />
              </label>
            </div>
            <div className="bg-grid">
              {/* Custom Background Thumb if exists */}
              {liveState.background && liveState.background.startsWith('url') && (
                <div 
                  className={`bg-thumb custom-bg ${liveState.background.startsWith('url') ? 'active' : ''}`}
                  style={{ background: liveState.background }}
                  onClick={() => handleBackgroundChange(liveState.background)}
                  title="Custom Background"
                />
              )}
              {BACKGROUNDS.map(bg => (
                <div 
                  key={bg.name}
                  className={`bg-thumb ${liveState.background === bg.value ? 'active' : ''}`}
                  style={{ background: bg.value }}
                  onClick={() => handleBackgroundChange(bg.value)}
                  title={bg.name}
                />
              ))}
            </div>
          </div>

          {/* Logo Section */}
          <div className="logo-picker-section">
            <div className="section-header-row">
              <h4>Church Logo</h4>
              <label className="upload-label" title="Upload Logo">
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logos')} hidden disabled={isUploading} />
              </label>
            </div>
            {liveState.logoUrl ? (
              <div className="logo-preview-thumb">
                <img 
                  src={liveState.logoUrl} 
                  alt="Logo Preview" 
                  onError={(e) => {
                    console.error("Image load failed");
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="logo-placeholder-hint">No logo uploaded yet</div>
            )}
          </div>

        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className={`toast-notification glass-morphism animate-slide-down ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Fullscreen Presenter Overlay */}
      {isFullscreenPresenter && (
        <div 
          className="fullscreen-presenter-overlay"
          style={{ 
            background: liveState.background, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center' 
          }}
        >
          <button 
            className="close-fullscreen-btn" 
            onClick={() => setIsFullscreenPresenter(false)}
          >
            <Minimize size={24} />
          </button>
          
          <div className="presenter-lyrics-display">
            {liveState.type === 'SLIDE' ? (
              <p>{liveState.content.split('\n\n')[liveState.slideIndex]}</p>
            ) : liveState.type === 'LOGO' ? (
              <img src={liveState.logoUrl} alt="Logo" className="presenter-logo" />
            ) : liveState.type === 'CLEAR' ? (
              <p></p>
            ) : (
              <p className="off-air-text">OFF-AIR</p>
            )}
          </div>

          <div className="presenter-controls-bar glass-morphism">
            <button 
              className={`presenter-btn ${liveState.type === 'CLEAR' ? 'active' : ''}`}
              onClick={() => handleControl('CLEAR')}
            >
              <Eraser size={20} /> Clear
            </button>
            
            <button 
              className={`presenter-btn ${liveState.type === 'LOGO' ? 'active' : ''}`}
              onClick={() => handleControl('LOGO')}
            >
              <ImageIcon size={20} /> Logo
            </button>
            
            <button 
              className="presenter-btn nav-btn" 
              onClick={prevSlide}
              disabled={liveState.type !== 'SLIDE' || liveState.slideIndex === 0}
            >
              <ChevronLeft size={24} /> Prev
            </button>

            <button 
              className="presenter-btn nav-btn" 
              onClick={nextSlide}
              disabled={liveState.type !== 'SLIDE' || liveState.slideIndex === liveState.content.split('\n\n').length - 1}
            >
              Next <ChevronRight size={24} />
            </button>

            {previewSong && (
              <button 
                className="presenter-btn go-live-btn"
                onClick={() => goLive()}
              >
                <Send size={20} /> GO LIVE
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Controller;
