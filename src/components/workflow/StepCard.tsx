'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

export default function StepCard({ step }: { step: any }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={{ ...style, display: 'flex', alignItems: 'center', padding: '1rem', background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '1rem' }}>
      <div {...attributes} {...listeners} style={{ cursor: 'grab', marginRight: '1rem', color: 'var(--muted)' }}>
        <GripVertical size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold' }}>{step.name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{step.type}</div>
      </div>
      <button className="btn-ghost" style={{ padding: '0.5rem', color: 'var(--error)' }}>
        <Trash2 size={18} />
      </button>
    </div>
  );
}
