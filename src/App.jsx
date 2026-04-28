import React, { useState, useEffect } from 'react';
import './App.css';

const DEFAULT_SONGS = [
  {
    title: "Lord I Lift Your Name",
    content: "Welcome to Worship Service\n\nLord I lift Your name on high\n\nYou came from heaven to earth\n\nTo show the way\n\nFrom the earth to the cross\n\nMy debt to pay\n\nFrom the cross to the grave\n\nFrom the grave to the sky\n\nLord I lift Your name on high!\n\nThank You Lord!"
  }
];

function App() {
  const [songs, setSongs] = useState(() => {
    const saved = localStorage.getItem('worship_songs');
    return saved ? JSON.parse(saved) : DEFAULT_SONGS;
  });
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('worship_projects');
    return saved ? JSON.parse(saved) : [{ id: 'default', name: 'Sunday Service', lineup: [] }];
  });
  const [activeProjectId, setActiveProjectId] = useState('default');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const currentSong = songs[currentSongIndex] || { title: "No Song", content: "" };
  const slides = currentSong.content.split('\n\n').filter(s => s.trim() !== "");
  const filteredSongs = songs.filter(song => 
    song.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    localStorage.setItem('worship_songs', JSON.stringify(songs));
  }, [songs]);

  useEffect(() => {
    localStorage.setItem('worship_projects', JSON.stringify(projects));
  }, [projects]);

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isEditing) return;
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, slides.length, isEditing]);

  const handleSaveSong = () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    let finalContent = editContent.trim();
    if (!finalContent.includes('\n\n')) {
      const lines = finalContent.split('\n');
      const chunks = [];
      for (let i = 0; i < lines.length; i += 4) {
        chunks.push(lines.slice(i, i + 4).join('\n'));
      }
      finalContent = chunks.join('\n\n');
    }
    const newSong = { title: editTitle, content: finalContent };
    
    // Save to global library
    setSongs([...songs, newSong]);
    
    // ALSO add directly to active project's lineup
    const updatedProjects = projects.map(p => {
      if (p.id === activeProjectId) {
        return { ...p, lineup: [...p.lineup, { ...newSong, lineupId: Date.now() }] };
      }
      return p;
    });
    setProjects(updatedProjects);

    setEditTitle("");
    setEditContent("");
    setIsEditing(false);
    
    // Automatically select the newly added song in the lineup
    setCurrentSongIndex(songs.length); 
    setCurrentSlideIndex(0);
  };

  const autoSplitContent = () => {
    const lines = editContent.split('\n').filter(l => l.trim() !== "");
    const chunks = [];
    for (let i = 0; i < lines.length; i += 4) {
      chunks.push(lines.slice(i, i + 4).join('\n'));
    }
    setEditContent(chunks.join('\n\n'));
  };

  const deleteSong = (index) => {
    if (!window.confirm("Are you sure you want to delete this song?")) return;
    const newSongs = songs.filter((_, i) => i !== index);
    setSongs(newSongs);
    if (currentSongIndex >= newSongs.length) {
      setCurrentSongIndex(Math.max(0, newSongs.length - 1));
    }
  };

  const addProject = () => {
    if (!newProjectName.trim()) return;
    const newProj = { id: Date.now().toString(), name: newProjectName, lineup: [] };
    setProjects([...projects, newProj]);
    setActiveProjectId(newProj.id);
    setNewProjectName("");
    setIsAddingProject(false);
  };

  const deleteProject = (id) => {
    if (projects.length <= 1) return;
    if (!window.confirm("Delete this project?")) return;
    const newProjs = projects.filter(p => p.id !== id);
    setProjects(newProjs);
    if (activeProjectId === id) setActiveProjectId(newProjs[0].id);
  };

  const addToLineup = (song) => {
    const updatedProjects = projects.map(p => {
      if (p.id === activeProjectId) {
        return { ...p, lineup: [...p.lineup, { ...song, lineupId: Date.now() }] };
      }
      return p;
    });
    setProjects(updatedProjects);
  };

  const removeFromLineup = (lineupId) => {
    const updatedProjects = projects.map(p => {
      if (p.id === activeProjectId) {
        return { ...p, lineup: p.lineup.filter(s => s.lineupId !== lineupId) };
      }
      return p;
    });
    setProjects(updatedProjects);
  };

  return (
    <div className="app-container">
      <aside className="control-panel">
        <header className="panel-header">
          <div className="header-top">
            <h1>EasyWorship Clone</h1>
            <div className="header-actions">
              <button className="add-btn" onClick={() => setIsAddingProject(!isAddingProject)} title="New Project">📅</button>
              <button className="add-btn" onClick={() => setIsEditing(!isEditing)} title="New Song">🎵</button>
            </div>
          </div>
        </header>

        {isAddingProject && (
          <div className="project-modal">
            <input 
              type="text" 
              placeholder="Service Name (e.g. Sunday Service)..." 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="editor-input"
            />
            <button className="save-btn" onClick={addProject}>Create Project</button>
          </div>
        )}

        {isEditing ? (
          <div className="editor-view">
            {/* ... (Editor remains same) */}
            <input 
              type="text" 
              placeholder="Song Title..." 
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="editor-input"
            />
            <div className="editor-controls">
              <button className="tool-btn" onClick={autoSplitContent}>
                🪄 Auto-Split (4 lines)
              </button>
            </div>
            <textarea 
              placeholder="Enter lyrics here...&#10;Tip: Blank lines separate slides." 
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="editor-textarea"
            />
            
            <div className="live-preview-section">
              <h4>Live Slide Preview ({editContent.split('\n\n').filter(s => s.trim() !== "").length} slides)</h4>
              <div className="mini-slides">
                {editContent.split('\n\n').filter(s => s.trim() !== "").map((s, i) => (
                  <div key={i} className="mini-slide-item">
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <button className="save-btn" onClick={handleSaveSong}>Save Song</button>
          </div>
        ) : (
          <div className="sidebar-scroll">
            {/* Project Switcher */}
            <div className="projects-section">
              <div className="section-header">
                <h3>Select Project</h3>
                <select 
                  value={activeProjectId} 
                  onChange={(e) => setActiveProjectId(e.target.value)}
                  className="project-select"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lineup Section (PRIORITY) */}
            <div className="lineup-section">
              <div className="section-header">
                <h3>{activeProject.name} Lineup</h3>
                <button className="add-btn mini" onClick={() => setIsEditing(true)}>+ Add Song</button>
              </div>
              <div className="song-list">
                {activeProject.lineup.length === 0 && <p className="empty-msg">No songs in this service yet. Add one!</p>}
                {activeProject.lineup.map((item, index) => (
                  <div 
                    key={item.lineupId} 
                    className={`song-item ${currentSongIndex === songs.findIndex(s => s.title === item.title) ? 'active' : ''}`}
                    onClick={() => {
                      const originalIndex = songs.findIndex(s => s.title === item.title && s.content === item.content);
                      setCurrentSongIndex(originalIndex);
                      setCurrentSlideIndex(0);
                    }}
                  >
                    <span>{item.title}</span>
                    <button className="delete-btn" onClick={(e) => {
                      e.stopPropagation();
                      removeFromLineup(item.lineupId);
                    }}>×</button>
                  </div>
                ))}
              </div>
              {projects.length > 1 && (
                <button className="clear-btn danger" onClick={() => deleteProject(activeProjectId)}>Delete This Project</button>
              )}
            </div>

            {/* Library Section (Secondary) */}
            <div className="library-section">
              <div className="library-header">
                <h3>Library (All Songs)</h3>
                <input 
                  type="text" 
                  placeholder="Search library..." 
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="song-list mini-list">
                {filteredSongs.map((song, index) => {
                  const actualIndex = songs.indexOf(song);
                  return (
                    <div key={actualIndex} className="song-item compact">
                      <span>{song.title}</span>
                      <button className="action-btn" onClick={() => addToLineup(song)} title="Add to this Project">+</button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="slides-section">
              <h3>Current Slides</h3>
              <div className="slides-list">
                {slides.map((slide, index) => (
                  <div 
                    key={index} 
                    className={`slide-item ${currentSlideIndex === index ? 'active' : ''}`}
                    onClick={() => setCurrentSlideIndex(index)}
                  >
                    <span className="slide-number">{index + 1}</span>
                    <span className="slide-preview">{slide}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <footer className="panel-footer">
          <div className="nav-buttons">
            <button onClick={prevSlide} disabled={currentSlideIndex === 0}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Prev
            </button>
            <button onClick={nextSlide} disabled={currentSlideIndex === slides.length - 1}>
              Next
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </footer>
      </aside>

      <main className="stage">
        <div className="stage-content">
          <div key={`${currentSongIndex}-${currentSlideIndex}`} className="slide-content animate-fade">
            {slides[currentSlideIndex]}
          </div>
        </div>
        
        <div className="stage-overlay">
          <div className="song-info">
            <h2>{currentSong.title}</h2>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
            ></div>
          </div>
          <div className="slide-counter">
            {currentSlideIndex + 1} / {slides.length}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

