import React, { useState, useEffect } from 'react';
import { notesAPI } from '../services/api';
import '../styles/NoteEditor.css';

function NoteEditor({ note, onClose, onSave, showNotification }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(null);

  const isNewNote = !note;
  const hasLock = note?.hasLock;
  const viewOnly = note?.viewOnly;

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || '');
    }
  }, [note]);

  // Lock renewal timer
  useEffect(() => {
    if (!hasLock) return;

    // Renew lock every 2 minutes (lock timeout is 5 minutes)
    const renewInterval = setInterval(async () => {
      try {
        await notesAPI.acquireLock(note.note_id);
        console.log('Lock renewed');
      } catch (err) {
        console.error('Failed to renew lock:', err);
        showNotification('Failed to renew lock', 'warning');
      }
    }, 120000); // 2 minutes

    // Update countdown timer every second
    const countdownInterval = setInterval(() => {
      notesAPI
        .getLockStatus(note.note_id)
        .then((response) => {
          setLockTimeRemaining(response.data.lockTimeRemaining);
        })
        .catch(() => {});
    }, 1000);

    return () => {
      clearInterval(renewInterval);
      clearInterval(countdownInterval);
    };
  }, [hasLock, note]);

  const handleSave = async () => {
    if (!title.trim()) {
      showNotification('Title is required', 'error');
      return;
    }

    try {
      setSaving(true);

      if (isNewNote) {
        await notesAPI.create(title, content);
        showNotification('Note created successfully', 'success');
      } else {
        await notesAPI.update(note.note_id, title, content);
        showNotification('Note updated successfully', 'success');
        // Release lock after successful save
        await notesAPI.releaseLock(note.note_id);
      }

      onSave();
      onClose();
    } catch (err) {
      showNotification(
        err.response?.data?.error || 'Failed to save note',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (hasLock) {
      try {
        await notesAPI.releaseLock(note.note_id);
      } catch (err) {
        console.error('Failed to release lock:', err);
      }
    }
    onClose();
  };

  return (
    <div className="note-editor">
      <div className="editor-header">
        <h2>{viewOnly ? 'View Note' : isNewNote ? 'Create New Note' : 'Edit Note'}</h2>
        {hasLock && lockTimeRemaining !== null && (
          <span className="lock-timer">
            🔒 Lock expires in: {Math.floor(lockTimeRemaining / 60)}:
            {String(lockTimeRemaining % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="editor-form">
        <div className="form-group">
          <label htmlFor="note-title">Title</label>
          <input
            type="text"
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter note title..."
            disabled={saving || viewOnly}
            autoFocus={!viewOnly}
            readOnly={viewOnly}
          />
        </div>

        <div className="form-group">
          <label htmlFor="note-content">Content</label>
          <textarea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter note content..."
            disabled={saving || viewOnly}
            readOnly={viewOnly}
            rows={15}
          />
        </div>

        <div className="editor-actions">
          {!viewOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-save"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          <button
            onClick={handleCancel}
            disabled={saving}
            className="btn-cancel"
          >
            {viewOnly ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NoteEditor;
