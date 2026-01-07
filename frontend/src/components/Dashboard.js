import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { notesAPI } from '../services/api';
import NoteEditor from './NoteEditor';
import '../styles/Dashboard.css';

function Dashboard() {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await notesAPI.getAll();
      setNotes(response.data.notes);
    } catch (err) {
      setError('Failed to load notes');
      showNotification('Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateNote = () => {
    setSelectedNote(null);
    setShowEditor(true);
  };

  const handleViewNote = (note) => {
    // For guests or read-only viewing
    setSelectedNote({ ...note, viewOnly: true });
    setShowEditor(true);
  };

  const handleEditNote = async (note) => {
    // Guests cannot edit
    if (user.role === 'Guest') {
      handleViewNote(note);
      return;
    }

    // Users can only edit their own notes
    if (user.role === 'User' && note.owner_id !== user.userId) {
      handleViewNote(note);
      return;
    }

    try {
      // Try to acquire lock
      const lockResponse = await notesAPI.acquireLock(note.note_id);
      
      if (lockResponse.data.lockAcquired) {
        setSelectedNote({ ...note, hasLock: true });
        setShowEditor(true);
        showNotification(
          lockResponse.data.renewed ? 'Lock renewed' : 'Lock acquired',
          'success'
        );
      }
    } catch (err) {
      if (err.response?.status === 423) {
        showNotification(err.response.data.error, 'warning');
      } else {
        showNotification('Failed to acquire lock', 'error');
      }
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await notesAPI.delete(noteId);
      showNotification('Note deleted successfully', 'success');
      fetchNotes();
    } catch (err) {
      showNotification(
        err.response?.data?.error || 'Failed to delete note',
        'error'
      );
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedNote(null);
    fetchNotes();
  };

  const canEdit = (note) => {
    // Admin can edit any note, User can edit only their own notes, Guest cannot edit
    if (user.role === 'Guest') return false;
    return user.role === 'Admin' || note.owner_id === user.userId;
  };

  const canDelete = (note) => {
    // Admin can delete any note, User can delete only their own notes, Guest cannot delete
    if (user.role === 'Guest') return false;
    return user.role === 'Admin' || note.owner_id === user.userId;
  };

  const canCreate = () => {
    // Admin and User can create notes, Guest cannot
    return user.role === 'Admin' || user.role === 'User';
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>📝 Distributed Notes</h1>
          <div className="user-info">
            <span className="username">{user.username}</span>
            <span className={`role-badge role-${user.role.toLowerCase()}`}>
              {user.role}
            </span>
            <button onClick={logout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Your Notes</h2>
            {canCreate() && (
              <button onClick={handleCreateNote} className="btn-create">
                + New Note
              </button>
            )}
          </div>

          {loading && <div className="loading">Loading notes...</div>}
          {error && <div className="error">{error}</div>}

          <div className="notes-list">
            {notes.map((note) => (
              <div
                key={note.note_id}
                className={`note-item ${note.locked_by ? 'locked' : ''}`}
                onClick={() => handleEditNote(note)}
              >
                <div className="note-header">
                  <h3>{note.title}</h3>
                  {note.locked_by && (
                    <span className="lock-icon" title={`Locked by ${note.locked_by_name}`}>
                      🔒
                    </span>
                  )}
                </div>
                <p className="note-preview">
                  {note.content?.substring(0, 100) || 'No content'}
                  {note.content?.length > 100 && '...'}
                </p>
                <div className="note-meta">
                  <span className="note-owner">By {note.owner_name}</span>
                  <span className="note-date">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="note-actions">
                  {user.role === 'Guest' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewNote(note);
                      }}
                      className="btn-view"
                    >
                      View
                    </button>
                  ) : (
                    <>
                      {canEdit(note) && !note.locked_by && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditNote(note);
                          }}
                          className="btn-edit"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete(note) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.note_id);
                          }}
                          className="btn-delete"
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Editor */}
        <section className="content-area">
          {showEditor ? (
            <NoteEditor
              note={selectedNote}
              onClose={handleCloseEditor}
              onSave={fetchNotes}
              showNotification={showNotification}
            />
          ) : (
            <div className="empty-state">
              <h2>Welcome to Distributed Notes</h2>
              <p>Select a note to view or edit, or create a new one.</p>
              <div className="stats">
                <div className="stat-card">
                  <span className="stat-number">{notes.length}</span>
                  <span className="stat-label">Total Notes</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">
                    {notes.filter((n) => n.locked_by).length}
                  </span>
                  <span className="stat-label">Currently Locked</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">
                    {notes.filter((n) => n.owner_id === user.userId).length}
                  </span>
                  <span className="stat-label">Your Notes</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
