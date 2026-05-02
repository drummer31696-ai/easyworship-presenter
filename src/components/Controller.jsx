import React, { useState, useEffect } from 'react';
import { Search, Play, Monitor, Square, Eraser, Image as ImageIcon, Send, Wifi, WifiOff, Plus, Download, X } from 'lucide-react';
import { sendLiveUpdate, subscribeToLiveUpdates } from '../services/firebase';
import './Controller.css';

const DEFAULT_SONGS = [
  {
    id: 1,
    title: "Lord I Lift Your Name",
    artist: "Rick Founds",
    content: "Lord I lift Your name on high\n\nLord I love to sing Your praises\n\nI'm so glad You're in my life\n\nI'm so glad You came to save us"
  },
  {
    id: 2,
    title: "Amazing Grace",
    artist: "John Newton",
    content: "Amazing grace how sweet the sound\n\nThat saved a wretch like me\n\nI once was lost but now am found\n\nWas blind but now I see"
  },
  {
    id: 3,
    title: "Salamat Salamat",
    artist: "Malayang Pilipino",
    content: "Kung aking mamasdan ang kalawakan\n\nHindi ko maunawaan ang Iyong dahilan\n\nKung bakit Ako'y Iyong pinili\n\nSalamat sa Iyong pag-ibig"
  },
  {
    id: 4,
    title: "Dakilang Katapatan",
    artist: "Papuri Singers",
    content: "Sadyang kay buti ng ating Panginoon\n\nMagtatapat sa habang panahon\n\nMaging sa kabila ng ating pagkukulang\n\nBiyaya Niya'y patuloy na laan"
  },
  {
    id: 5,
    title: "Daygon Ikaw",
    artist: "Bisaya Worship",
    content: "Daygon Ikaw, O Dios\n\nSa Imong pagkabalaan\n\nDaygon Ikaw, O Dios\n\nSa Imong kagahum"
  },
  {
    id: 6,
    title: "Salamat O Dios",
    artist: "Bisaya Worship",
    content: "Salamat O Dios sa Imong kaayo\n\nSalamat O Dios sa Imong gugma\n\nWala nay sama Kanimo\n\nLabaw Ka sa tanan"
  },
  {
    id: 7,
    title: "Dahunog",
    artist: "Influence",
    content: "Sa pagsinggit namo, ang langit moabli\n\nSa pagdayeg namo, ang kasingkasing Mo malipay\n\nDahunog sa kalangitan, madunggan sa tibuok kalibutan\n\nAng gahum ug himaya Mo, O Dios, mopuno niining dapita"
  }
];

const Controller = () => {
  const [songs, setSongs] = useState(DEFAULT_SONGS);
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
  
  // Debounced search for suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (importQuery.trim()) {
        searchSuggestions();
      }
    }, 600); // Wait 600ms after typing
    return () => clearTimeout(timer);
  }, [importQuery]);

  const [liveState, setLiveState] = useState({
    title: "",
    content: "",
    slideIndex: 0,
    type: 'CLEAR'
  });

  // Keyboard navigation for Live Slides
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (liveState.type !== 'SLIDE') return;

      const slides = liveState.content.split('\n\n');
      
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        const nextIdx = liveState.slideIndex + 1;
        if (nextIdx < slides.length) {
          const newState = { ...liveState, slideIndex: nextIdx };
          setLiveState(newState);
          sendLiveUpdate(newState);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = liveState.slideIndex - 1;
        if (prevIdx >= 0) {
          const newState = { ...liveState, slideIndex: prevIdx };
          setLiveState(newState);
          sendLiveUpdate(newState);
        }
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
    if (!song) return;
    const newState = {
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
      const response = await fetchWithTimeout(`http://localhost:8080/proxy/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`);
      
      if (response.status === 404) {
        setIsManualMode(true);
        setImportQuery(title);
        setManualLyrics('');
        return;
      }

      const data = await response.json();
      if (data.lyrics) {
        const formattedContent = autoFormatLyrics(data.lyrics);
        const newSong = {
          id: Date.now(),
          title: title,
          content: formattedContent,
          artist: artist
        };
        setSongs([newSong, ...songs]);
        setPreviewSong(newSong);
        closeModal();
      } else {
        setIsManualMode(true);
        setImportQuery(title);
      }
    } catch (e) {
      setIsManualMode(true);
      setImportQuery(title);
    } finally {
      setIsFetching(false);
    }
  };

  const handleManualSave = () => {
    if (!importQuery || !manualLyrics) return;
    const formattedContent = autoFormatLyrics(manualLyrics);
    const newSong = {
      id: Date.now(),
      title: importQuery,
      content: formattedContent,
      artist: 'Manual'
    };
    setSongs([newSong, ...songs]);
    setPreviewSong(newSong);
    closeModal();
  };

  const closeModal = () => {
    setShowImportModal(false);
    setImportQuery('');
    setSuggestions([]);
    setIsManualMode(false);
    setManualLyrics('');
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
      setSongs(songs.filter(s => s.id !== id));
      if (previewSong?.id === id) setPreviewSong(null);
    }
  };

  const previewSlides = previewSong ? previewSong.content.split('\n\n') : [];

  return (
    <div className="controller-container">
      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-morphism animate-fade-in">
            <div className="modal-header">
              <h3>{isManualMode ? 'Manual Entry' : 'Search & Add Song'}</h3>
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
                    <button className="primary-btn" onClick={handleManualSave}>Save Song</button>
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
              <button className="delete-btn" onClick={(e) => deleteSong(e, song.id)}>
                <X size={14} />
              </button>
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
          {previewSong && (
            <button className="go-live-btn" onClick={() => goLive()}>
              <Send size={16} /> GO LIVE
            </button>
          )}
        </div>
        <div className="pane-content scrollable">
          {previewSong ? (
            previewMode === 'SLIDES' ? (
              <div className="preview-slides-grid">
                {previewSlides.map((slide, idx) => (
                  <div 
                    key={idx} 
                    className={`preview-slide ${previewSlideIndex === idx ? 'active' : ''}`}
                    onClick={() => {
                      setPreviewSlideIndex(idx);
                    }}
                    onDoubleClick={() => goLive(previewSong, idx)}
                  >
                    <span className="slide-num">{idx + 1}</span>
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
          <div className="ws-status" title={isWsConnected ? "Connected to Backend" : "Backend Disconnected"}>
            {isWsConnected ? <Wifi size={16} color="#10b981" /> : <WifiOff size={16} color="#f43f5e" />}
          </div>
        </div>
        
        <div className="live-output-section">
          <div className="live-preview-box">
            {liveState.type === 'SLIDE' ? (
              <div className="live-content">
                <p>{liveState.content.split('\n\n')[liveState.slideIndex]}</p>
              </div>
            ) : (
              <div className="live-placeholder">{liveState.type}</div>
            )}
          </div>
          <div className="live-song-title">
            {liveState.type === 'SLIDE' ? liveState.title : 'OFF-AIR'}
          </div>
        </div>

        {/* NEW: Live Slides List for instant switching */}
        <div className="live-slides-list scrollable">
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
        
        <div className="quick-controls">
          <button 
            className={`control-btn ${liveState.type === 'BLACK' ? 'active' : ''}`}
            onClick={() => handleControl('BLACK')}
          >
            <Square fill="currentColor" size={20} /> BLACK
          </button>
          <button 
            className={`control-btn ${liveState.type === 'CLEAR' ? 'active' : ''}`}
            onClick={() => handleControl('CLEAR')}
          >
            <Eraser size={20} /> CLEAR
          </button>
          <button 
            className={`control-btn ${liveState.type === 'LOGO' ? 'active' : ''}`}
            onClick={() => handleControl('LOGO')}
          >
            <ImageIcon size={20} /> LOGO
          </button>
        </div>
      </div>
    </div>
  );
};

export default Controller;
