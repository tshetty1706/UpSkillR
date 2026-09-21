import React, { useState } from 'react';
import { GripVertical, Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import './DynamicListInput.css';

export const DynamicListInput = ({
  items = [],
  onChange,
  placeholder = 'Add a key learning outcome...',
  maxItems = 10,
  minItems = 1
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleItemChange = (index, value) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  const handleAddItem = () => {
    if (items.length >= maxItems) return;
    onChange([...items, '']);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= minItems) {
      const updated = [...items];
      updated[index] = '';
      onChange(updated);
      return;
    }
    onChange(items.filter((_, idx) => idx !== index));
  };

  const handleMove = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    onChange(updated);
  };

  // ─── Drag & Drop Event Handlers ───
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // optional reset
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...items];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);
    onChange(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="dynamic-list-input-container">
      <div className="dynamic-list-items">
        {items.map((item, idx) => {
          const isDragging = draggedIndex === idx;
          const isDragOver = dragOverIndex === idx;

          return (
            <div
              key={idx}
              className={`dynamic-list-row ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'drag-over-target' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag Handle */}
              <div
                className="dynamic-list-drag-handle"
                title="Click and drag to reorder"
              >
                <GripVertical size={16} />
              </div>

              {/* Move Up/Down Quick Controls */}
              <div className="dynamic-list-reorder-btns">
                <button
                  type="button"
                  className="dynamic-list-move-btn"
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, -1)}
                  title="Move up"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  type="button"
                  className="dynamic-list-move-btn"
                  disabled={idx === items.length - 1}
                  onClick={() => handleMove(idx, 1)}
                  title="Move down"
                >
                  <ChevronDown size={13} />
                </button>
              </div>

              {/* Item Index Badge */}
              <span className="dynamic-list-idx-badge">{idx + 1}</span>

              {/* Text Input */}
              <input
                type="text"
                className="dynamic-list-text-input"
                value={item}
                onChange={(e) => handleItemChange(idx, e.target.value)}
                placeholder={`${placeholder} (Item ${idx + 1})`}
              />

              {/* Delete Button */}
              <button
                type="button"
                className="dynamic-list-delete-btn"
                onClick={() => handleRemoveItem(idx)}
                title="Delete item"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {items.length < maxItems && (
        <button
          type="button"
          className="dynamic-list-add-btn"
          onClick={handleAddItem}
        >
          <Plus size={16} />
          <span>Add item</span>
        </button>
      )}
    </div>
  );
};
