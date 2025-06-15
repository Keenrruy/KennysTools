import React, { useState, useEffect, useRef } from 'react';
import { get, set } from 'idb-keyval';

// Helper to load notes from IndexedDB
async function loadNotes() {
  const saved = await get('notes');
  return saved || [];
}

function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

// Only allow light colors (pastels, light grays, etc.)
const LIGHT_COLORS = [
  '#fffbe6', '#e6f7ff', '#e6ffe6', '#ffe6fa', '#f0f0f0', '#f9fbe7', '#e3f2fd', '#fce4ec', '#f3e5f5', '#e8f5e9',
  '#fffde7', '#e1f5fe', '#f1f8e9', '#f8bbd0', '#f5f5f5', '#f0fff0', '#f5f5dc', '#f0ffff', '#f5fffa', '#f8f8ff'
];

function App() {
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState([]);
  const [isPinned, setIsPinned] = useState(false); // For extension window pin
  const [bgImage, setBgImage] = useState(null);
  const [bgDrag, setBgDrag] = useState(false);
  const [bgOffset, setBgOffset] = useState({ x: 0, y: 0 });
  const [bgTempOffset, setBgTempOffset] = useState({ x: 0, y: 0 });
  const [bgDragStart, setBgDragStart] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef();
  const bgInputRef = useRef();
  const bgContainerRef = useRef();

  // Load notes and background from IndexedDB on mount
  useEffect(() => {
    loadNotes().then(n => {
      setNotes(n);
      if (n.length > 0) setSelectedId(n[0].id);
    });
    get('bgImage').then(img => {
      if (img) setBgImage(img);
    });
    get('bgOffset').then(offset => {
      if (offset) setBgOffset(offset);
    });
  }, []);

  // Save notes to IndexedDB whenever notes change
  useEffect(() => {
    set('notes', notes);
  }, [notes]);

  // Save background image and offset to IndexedDB
  useEffect(() => {
    set('bgImage', bgImage);
  }, [bgImage]);
  useEffect(() => {
    set('bgOffset', bgOffset);
  }, [bgOffset]);

  // Add a new empty note and select it
  const handleAddNote = () => {
    const newNote = { id: generateId(), text: '', pinned: false, color: LIGHT_COLORS[0] };
    setNotes([newNote, ...notes]);
    setSelectedId(newNote.id);
  };

  // Enter delete mode
  const handleDeleteMode = () => {
    setDeleteMode(true);
    setSelectedForDelete([]);
  };

  // Exit delete mode
  const handleCancelDelete = () => {
    setDeleteMode(false);
    setSelectedForDelete([]);
  };

  // Confirm delete selected notes
  const handleConfirmDelete = () => {
    setNotes(notes.filter(n => !selectedForDelete.includes(n.id)));
    setDeleteMode(false);
    setSelectedForDelete([]);
    if (selectedForDelete.includes(selectedId)) {
      const remaining = notes.filter(n => !selectedForDelete.includes(n.id));
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Toggle note selection for delete
  const handleSelectForDelete = (id) => {
    setSelectedForDelete(sel =>
      sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]
    );
  };

  // Delete a single note (not in delete mode)
  const handleDeleteNote = () => {
    if (!selectedId) return;
    setNotes(notes.filter(n => n.id !== selectedId));
    const idx = notes.findIndex(n => n.id === selectedId);
    const newNotes = notes.filter(n => n.id !== selectedId);
    if (newNotes.length > 0) {
      const nextIdx = idx < newNotes.length ? idx : newNotes.length - 1;
      setSelectedId(newNotes[nextIdx].id);
    } else {
      setSelectedId(null);
    }
  };

  // Update note text
  const handleNoteChange = (id, value) => {
    setNotes(notes.map(n => n.id === id ? { ...n, text: value } : n));
  };

  // Trigger file input for background image upload
  const triggerBgImageUpload = () => {
    if (bgInputRef.current) bgInputRef.current.value = null;
    bgInputRef.current.click();
  };

  // Handle background image upload
  const handleBgImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBgImage(ev.target.result);
        setBgDrag(true);
        setBgTempOffset(bgOffset); // Start with current offset
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag background image
  const handleBgMouseDown = (e) => {
    if (!bgDrag) return;
    setBgDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleBgMouseMove = (e) => {
    if (!bgDrag || !bgDragStart) return;
    const dx = e.clientX - bgDragStart.x;
    const dy = e.clientY - bgDragStart.y;
    setBgTempOffset({ x: bgOffset.x + dx, y: bgOffset.y + dy });
  };
  const handleBgMouseUp = () => {
    if (!bgDrag) return;
    setBgDragStart(null);
  };
  // Confirm/cancel background drag
  const handleConfirmBgDrag = () => {
    setBgOffset(bgTempOffset);
    setBgDrag(false);
  };
  const handleCancelBgDrag = () => {
    setBgTempOffset(bgOffset);
    setBgDrag(false);
  };

  // Select a note
  const handleSelectNote = (id) => {
    if (deleteMode) {
      handleSelectForDelete(id);
    } else {
      setSelectedId(id);
    }
  };

  // Toggle pin for a note
  const handleTogglePin = (id) => {
    setNotes(notes => {
      const updated = notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n);
      return [
        ...updated.filter(n => n.pinned),
        ...updated.filter(n => !n.pinned)
      ];
    });
  };

  // Pin extension window (UI only, Chrome API workaround)
  const handlePinWindow = () => {
    setIsPinned(p => !p);
    if (!isPinned && window.chrome?.extension?.getURL) {
      window.open(window.location.href, '_blank', 'popup');
    }
  };

  // Color picker for selected note
  const handleColorChange = (color) => {
    if (!selectedId) return;
    setNotes(notes.map(n => n.id === selectedId ? { ...n, color } : n));
  };

  // Button style for top bar
  const topBarBtnStyle = {
    minWidth: 36,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    border: '1px solid #ccc',
    background: '#f7f7f7',
    margin: '0 2px',
    fontSize: 18,
    cursor: 'pointer',
    transition: 'background 0.2s, border 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
  };

  // Render
  return (
    <div
      style={{
        maxWidth: 370,
        margin: '0 auto',
        padding: 8,
        fontFamily: 'Arial',
        minHeight: 420,
        background: bgImage
          ? `url(${bgImage}) center/cover no-repeat`
          : 'linear-gradient(135deg, #f8f8ff 0%, #e6f7ff 100%)',
        borderRadius: 12,
        boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.3s'
      }}
    >
      {/* Background drag overlay */}
      {bgImage && bgDrag && (
        <div
          ref={bgContainerRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 100,
            cursor: 'grab',
            background: 'rgba(255,255,255,0.15)'
          }}
          onMouseDown={handleBgMouseDown}
          onMouseMove={handleBgMouseMove}
          onMouseUp={handleBgMouseUp}
        />
      )}
      {/* Top Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          <button onClick={handleAddNote} title="Add Note" style={topBarBtnStyle}>＋</button>
          {!deleteMode && <button onClick={handleDeleteMode} title="Delete Note" disabled={notes.length === 0} style={topBarBtnStyle}>🗑️</button>}
          {deleteMode && (
            <>
              <button onClick={handleConfirmDelete} title="Confirm Delete" style={{ ...topBarBtnStyle, color: 'green', border: '1.5px solid green' }}>✔️</button>
              <button onClick={handleCancelDelete} title="Cancel Delete" style={{ ...topBarBtnStyle, color: 'red', border: '1.5px solid red' }}>❌</button>
            </>
          )}
          {/* Color picker button for selected note */}
          <button
            onClick={() => setShowColorPicker(p => !p)}
            title="Change Note Color"
            style={{ ...topBarBtnStyle, fontSize: 16 }}
            disabled={!selectedId}
          >
            🎨
          </button>
          {showColorPicker && selectedId && (
            <select
              value={notes.find(n => n.id === selectedId)?.color || LIGHT_COLORS[0]}
              onChange={e => { handleColorChange(e.target.value); setShowColorPicker(false); }}
              style={{
                marginLeft: 4,
                border: '1px solid #ccc',
                borderRadius: 4,
                padding: '2px 4px',
                fontSize: 14,
                background: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                height: 32
              }}
            >
              {LIGHT_COLORS.map(c => (
                <option key={c} value={c} style={{ background: c }} />
              ))}
            </select>
          )}
          <button onClick={triggerBgImageUpload} title="Set App Background" style={topBarBtnStyle}>🌄</button>
          <input
            type="file"
            accept="image/*"
            ref={bgInputRef}
            style={{ display: 'none' }}
            onChange={handleBgImageChange}
          />
          {/* Background drag confirm/cancel */}
          {bgDrag && (
            <>
              <button onClick={handleConfirmBgDrag} title="Confirm Background Position" style={{ ...topBarBtnStyle, color: 'green', border: '1.5px solid green' }}>✔️</button>
              <button onClick={handleCancelBgDrag} title="Cancel Background Position" style={{ ...topBarBtnStyle, color: 'red', border: '1.5px solid red' }}>❌</button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
          <button
            onClick={handlePinWindow}
            title={isPinned ? 'Unpin Extension Window' : 'Pin Extension Window'}
            style={{
              ...topBarBtnStyle,
              color: isPinned ? '#fff' : '#1976d2',
              background: isPinned ? '#1976d2' : '#f7f7f7',
              border: isPinned ? '1.5px solid #1976d2' : '1px solid #ccc',
              fontWeight: isPinned ? 'bold' : 'normal',
              boxShadow: isPinned ? '0 0 8px #1976d2' : topBarBtnStyle.boxShadow
            }}
          >
            {isPinned ? '📌 Pinned' : '📌'}
          </button>
        </div>
      </div>
      {/* Notes List */}
      <div style={{ maxHeight: 350, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {notes.length === 0 && <p style={{ color: '#888' }}>No notes yet. Click ＋ to add one.</p>}
        {notes.map(note => (
          <div
            key={note.id}
            onClick={() => handleSelectNote(note.id)}
            style={{
              border: note.id === selectedId ? '2px solid #1976d2' : '1px solid #e0e0e0',
              borderRadius: 10,
              padding: 10,
              background: note.color || LIGHT_COLORS[0],
              cursor: deleteMode ? 'pointer' : 'default',
              boxShadow: '0 2px 12px 0 rgba(25, 118, 210, 0.10), 0 1.5px 4px 0 rgba(0,0,0,0.08)',
              transition: 'border 0.2s, background 0.2s, box-shadow 0.2s',
              display: 'flex',
              alignItems: 'flex-start',
              position: 'relative',
              minHeight: 60,
              overflow: 'visible',
              marginBottom: 2
            }}
          >
            {/* Pin star: outlined when not pinned, filled when pinned */}
            <span
              onClick={e => { e.stopPropagation(); handleTogglePin(note.id); }}
              title={note.pinned ? 'Unpin Note' : 'Pin Note'}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                fontSize: 20,
                color: note.pinned ? '#FFD600' : '#bbb',
                cursor: 'pointer',
                userSelect: 'none',
                zIndex: 2,
                background: 'transparent',
                borderRadius: '50%',
                padding: 0,
                boxShadow: 'none',
                transition: 'all 0.2s',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {note.pinned ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFD600" stroke="#FFD600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 17.27 18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21 12 17.27" /></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 17.27 18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21 12 17.27" /></svg>
              )}
            </span>
            {/* Note textarea */}
            <textarea
              value={note.text}
              onChange={e => handleNoteChange(note.id, e.target.value)}
              placeholder="Type your note..."
              style={{
                width: '100%',
                height: 60,
                resize: 'vertical',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 15,
                flex: 1,
                color: '#222',
                fontFamily: 'inherit',
                boxShadow: 'none',
                marginRight: 0
              }}
              onClick={e => e.stopPropagation()}
              disabled={deleteMode}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
