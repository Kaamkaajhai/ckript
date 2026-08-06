import React, { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Trash2, 
  Type, 
  Image as ImageIcon, 
  LayoutTemplate, 
  Layout, 
  Link as LinkIcon, 
  Minus,
  Settings,
  Plus
} from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

const BLOCK_DEFINITIONS = {
  TopBar: { type: 'TopBar', label: 'Top Bar', icon: Layout, defaultData: { logoUrl: '' } },
  HeroImage: { type: 'HeroImage', label: 'Hero Image', icon: ImageIcon, defaultData: { imageUrl: 'https://via.placeholder.com/640x360?text=Hero+Image' } },
  Heading: { type: 'Heading', label: 'Heading', icon: Type, defaultData: { text: 'New Heading', subtitle: '', align: 'center' } },
  Text: { type: 'Text', label: 'Text Block', icon: Type, defaultData: { content: 'This is a text block. You can add paragraphs here.', align: 'left' } },
  CTA: { type: 'CTA', label: 'Button', icon: LinkIcon, defaultData: { text: 'Click Here', url: 'https://ckript.com', align: 'center' } },
  FeatureCards: { type: 'FeatureCards', label: 'Feature Cards', icon: LayoutTemplate, defaultData: { cards: [{ title: 'Feature 1', description: 'Desc 1', iconUrl: '' }, { title: 'Feature 2', description: 'Desc 2', iconUrl: '' }] } },
  Divider: { type: 'Divider', label: 'Divider', icon: Minus, defaultData: {} },
  Footer: { type: 'Footer', label: 'Footer', icon: Layout, defaultData: {} }
};

// SORTABLE WRAPPER
function SortableBlock({ id, block, isSelected, onSelect, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative group mb-3 rounded-lg border-2 transition-all ${isSelected ? 'border-[#8B1E1E] shadow-sm' : 'border-transparent hover:border-gray-200'} bg-white`}
      onClick={() => onSelect(id)}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 p-1.5 bg-white border border-gray-200 rounded shadow-sm opacity-0 group-hover:opacity-100 cursor-grab text-gray-400 hover:text-gray-600 transition-opacity z-10"
      >
        <GripVertical size={16} />
      </div>

      {/* Delete Button */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(id); }}
          className="p-1.5 text-gray-400 hover:text-red-500 bg-white/90 backdrop-blur rounded hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Block Preview */}
      <div className="p-6 pointer-events-none">
        <BlockPreview block={block} />
      </div>
    </div>
  );
}

// VISUAL PREVIEW OF BLOCKS IN THE CANVAS
function BlockPreview({ block }) {
  switch (block.type) {
    case 'TopBar':
      return <div className="text-center font-bold text-2xl border-b pb-4">Ckript</div>;
    case 'Heading':
      return (
        <div style={{ textAlign: block.align }}>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{block.text}</h2>
          {block.subtitle && <p className="text-gray-500 mt-2 text-lg">{block.subtitle}</p>}
        </div>
      );
    case 'Text':
      return <div style={{ textAlign: block.align }} className="text-gray-600 leading-relaxed">{block.content}</div>;
    case 'HeroImage':
      return <img src={block.imageUrl} alt="Hero" className="w-full h-auto rounded-lg shadow-sm" />;
    case 'CTA':
      return (
        <div style={{ textAlign: block.align }}>
          <span className="inline-block bg-[#8B1E1E] text-white px-8 py-3 rounded-md font-semibold">{block.text}</span>
        </div>
      );
    case 'Divider':
      return <hr className="my-4 border-gray-200" />;
    case 'Footer':
      return <div className="bg-gray-50 p-6 text-center text-sm text-gray-500 rounded-lg">Footer Template (Unsubscribe, Company Info)</div>;
    case 'FeatureCards':
      return (
        <div className="grid grid-cols-2 gap-4">
          {block.cards?.map((card, i) => (
            <div key={i} className="p-4 border rounded-lg bg-gray-50">
              <div className="font-bold mb-1">{card.title}</div>
              <div className="text-sm text-gray-500">{card.description}</div>
            </div>
          ))}
        </div>
      );
    default:
      return <div>Unknown Block</div>;
  }
}

// MAIN BUILDER COMPONENT
export default function EmailBuilder({ blocks, setBlocks }) {
  const [selectedId, setSelectedId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addBlock = (type) => {
    const def = BLOCK_DEFINITIONS[type];
    const newBlock = { id: generateId(), type, ...def.defaultData };
    setBlocks([...blocks, newBlock]);
    setSelectedId(newBlock.id);
  };

  const updateSelectedBlock = (key, value) => {
    setBlocks(blocks.map(b => b.id === selectedId ? { ...b, [key]: value } : b));
  };

  const updateCard = (index, key, value) => {
    setBlocks(blocks.map(b => {
      if (b.id !== selectedId) return b;
      const newCards = [...b.cards];
      newCards[index] = { ...newCards[index], [key]: value };
      return { ...b, cards: newCards };
    }));
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selectedBlock = useMemo(() => blocks.find(b => b.id === selectedId), [blocks, selectedId]);

  return (
    <div className="flex h-[800px] bg-gray-50 border rounded-xl overflow-hidden shadow-sm">
      
      {/* LEFT SIDEBAR: BLOCK PALETTE */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b font-semibold text-gray-800 flex items-center gap-2">
          <Plus size={18} /> Add Blocks
        </div>
        <div className="p-3 grid grid-cols-2 gap-2 overflow-y-auto">
          {Object.entries(BLOCK_DEFINITIONS).map(([type, def]) => {
            const Icon = def.icon;
            return (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="flex flex-col items-center justify-center p-3 gap-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors"
              >
                <Icon size={20} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-700">{def.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER: CANVAS */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-2xl mx-auto min-h-full">
          {blocks.length === 0 ? (
            <div className="h-full flex items-center justify-center flex-col text-gray-400 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
              <LayoutTemplate size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium text-gray-600">Your email is empty</p>
              <p className="text-sm mt-1">Drag and drop blocks from the sidebar to build your campaign.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.map(block => (
                  <SortableBlock 
                    key={block.id} 
                    id={block.id} 
                    block={block} 
                    isSelected={selectedId === block.id}
                    onSelect={setSelectedId}
                    onDelete={deleteBlock}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: SETTINGS */}
      <div className="w-80 bg-white border-l flex flex-col">
        <div className="p-4 border-b font-semibold text-gray-800 flex items-center gap-2">
          <Settings size={18} /> Properties
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {!selectedBlock ? (
            <p className="text-gray-400 text-sm text-center mt-10">Select a block to edit its properties.</p>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{selectedBlock.type} SETTINGS</div>
              
              {/* HEADING / TEXT FIELDS */}
              {selectedBlock.text !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
                  <input type="text" value={selectedBlock.text} onChange={e => updateSelectedBlock('text', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
                </div>
              )}
              {selectedBlock.subtitle !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                  <input type="text" value={selectedBlock.subtitle} onChange={e => updateSelectedBlock('subtitle', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
                </div>
              )}
              {selectedBlock.content !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content (HTML allowed)</label>
                  <textarea value={selectedBlock.content} onChange={e => updateSelectedBlock('content', e.target.value)} className="w-full p-2 border rounded-md text-sm h-32" />
                </div>
              )}
              
              {/* URL FIELDS */}
              {selectedBlock.url !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                  <input type="url" value={selectedBlock.url} onChange={e => updateSelectedBlock('url', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
                </div>
              )}
              {selectedBlock.imageUrl !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input type="url" value={selectedBlock.imageUrl} onChange={e => updateSelectedBlock('imageUrl', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
                </div>
              )}
              {selectedBlock.logoUrl !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (optional)</label>
                  <input type="url" value={selectedBlock.logoUrl} onChange={e => updateSelectedBlock('logoUrl', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
                </div>
              )}

              {/* ALIGNMENT */}
              {selectedBlock.align !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alignment</label>
                  <select value={selectedBlock.align} onChange={e => updateSelectedBlock('align', e.target.value)} className="w-full p-2 border rounded-md text-sm">
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              )}

              {/* CARDS */}
              {selectedBlock.cards !== undefined && (
                <div className="space-y-4 border-t pt-4">
                  {selectedBlock.cards.map((card, i) => (
                    <div key={i} className="p-3 bg-gray-50 border rounded-md space-y-3">
                      <div className="text-xs font-bold text-gray-500">Card {i+1}</div>
                      <input type="text" placeholder="Title" value={card.title} onChange={e => updateCard(i, 'title', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
                      <input type="text" placeholder="Description" value={card.description} onChange={e => updateCard(i, 'description', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
                      <input type="url" placeholder="Icon URL (optional)" value={card.iconUrl} onChange={e => updateCard(i, 'iconUrl', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
                    </div>
                  ))}
                  <button 
                    onClick={() => updateSelectedBlock('cards', [...selectedBlock.cards, { title: 'New Card', description: '' }])}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded transition-colors"
                  >
                    Add Card
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
