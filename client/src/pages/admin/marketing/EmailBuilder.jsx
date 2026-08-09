import React, { useEffect, useState, useRef } from 'react';
import { Mail, Type, Image as ImageIcon, Link as LinkIcon, AlignLeft, Upload } from 'lucide-react';
import { adminApi } from "../../AdminDashboard";

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function EmailBuilder({ blocks, setBlocks }) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  // If no blocks are provided, initialize with a beautiful default template
  useEffect(() => {
    if (!blocks || blocks.length === 0) {
      setBlocks([
        { id: generateId(), type: 'HeroImage', imageUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1200&auto=format&fit=crop' },
        { id: generateId(), type: 'Heading', text: 'Announcing Our New Update', subtitle: 'We are thrilled to share this with you.', align: 'center' },
        { id: generateId(), type: 'Text', content: 'Here is where you can write the main content of your email. Keep it concise, engaging, and clear. A good email gets straight to the point.', align: 'left' },
        { id: generateId(), type: 'CTA', text: 'Learn More', url: 'https://ckript.com', align: 'center' },
        { id: generateId(), type: 'Footer' }
      ]);
    }
  }, [blocks, setBlocks]);

  // Helper to update a specific block type
  const updateBlock = (type, key, value) => {
    setBlocks(prev => prev.map(b => b.type === type ? { ...b, [key]: value } : b));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);
      
      const { data } = await adminApi.post("/messages/upload", formData);
      if (data?.fileUrl) {
        updateBlock("HeroImage", "imageUrl", data.fileUrl);
      }
    } catch (error) {
      console.error("Image upload error:", error);
      alert(error?.response?.data?.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Find blocks for binding to form inputs
  const heroBlock = blocks.find(b => b.type === 'HeroImage') || {};
  const headingBlock = blocks.find(b => b.type === 'Heading') || {};
  const textBlock = blocks.find(b => b.type === 'Text') || {};
  const ctaBlock = blocks.find(b => b.type === 'CTA') || {};

  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="flex flex-col md:flex-row h-auto min-h-[600px] bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      
      {/* LEFT: EDITOR FORM */}
      <div className="w-full md:w-5/12 bg-gray-50/50 border-r border-gray-100 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-white">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Mail size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Message Content</h3>
            <p className="text-xs text-gray-500">Edit the fields below to update your email</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Header Section */}
          <div className="space-y-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Type size={16} className="text-gray-400" /> Headers
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Main Heading</label>
              <input 
                type="text" 
                value={headingBlock.text || ''} 
                onChange={e => updateBlock('Heading', 'text', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="Enter heading..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Subtitle</label>
              <input 
                type="text" 
                value={headingBlock.subtitle || ''} 
                onChange={e => updateBlock('Heading', 'subtitle', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="Enter subtitle..."
              />
            </div>
          </div>

          {/* Body Section */}
          <div className="space-y-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <AlignLeft size={16} className="text-gray-400" /> Body Text
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Message</label>
              <textarea 
                value={textBlock.content || ''} 
                onChange={e => updateBlock('Text', 'content', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none min-h-[120px] resize-y"
                placeholder="Write your email content here..."
              />
            </div>
          </div>

          {/* Media Section */}
          <div className="space-y-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <ImageIcon size={16} className="text-gray-400" /> Cover Image
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Image URL</label>
              <div className="flex gap-2">
                <input 
                  type="url" 
                  value={heroBlock.imageUrl || ''} 
                  onChange={e => updateBlock('HeroImage', 'imageUrl', e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center disabled:opacity-50"
                  title="Upload Image"
                >
                  <Upload size={18} />
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Call to Action Section */}
          <div className="space-y-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <LinkIcon size={16} className="text-gray-400" /> Call to Action
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Button Text</label>
                <input 
                  type="text" 
                  value={ctaBlock.text || ''} 
                  onChange={e => updateBlock('CTA', 'text', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  placeholder="Click Here"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Button Link</label>
                <input 
                  type="url" 
                  value={ctaBlock.url || ''} 
                  onChange={e => updateBlock('CTA', 'url', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT: LIVE PREVIEW */}
      <div className="w-full md:w-7/12 bg-gray-100/50 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-gray-200/50 to-transparent pointer-events-none" />
        <div className="p-4 md:p-8 flex-1 overflow-y-auto flex items-start justify-center">
          
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mt-4 mb-8 transform transition-all hover:shadow-2xl">
            {/* Browser Header Mock */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="ml-4 text-xs font-medium text-gray-400">Live Preview</div>
            </div>

            {/* Email Content Preview */}
            <div className="flex flex-col">
              {heroBlock.imageUrl && (
                <div className="w-full h-48 bg-gray-100">
                  <img src={heroBlock.imageUrl} alt="Hero" className="w-full h-full object-cover" />
                </div>
              )}
              
              <div className="p-8 space-y-6">
                <div style={{ textAlign: headingBlock.align || 'center' }}>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                    {headingBlock.text || 'Your Heading Here'}
                  </h1>
                  {headingBlock.subtitle && (
                    <p className="mt-2 text-md text-gray-500 font-medium">
                      {headingBlock.subtitle}
                    </p>
                  )}
                </div>

                {textBlock.content && (
                  <div 
                    style={{ textAlign: textBlock.align || 'left' }}
                    className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap"
                  >
                    {textBlock.content}
                  </div>
                )}

                {ctaBlock.text && (
                  <div style={{ textAlign: ctaBlock.align || 'center' }} className="pt-4">
                    <a 
                      href={ctaBlock.url || '#'} 
                      onClick={e => e.preventDefault()}
                      // #8B1E1E, matching `brandRed` in compiler/emailCompiler.js, because this is a
                      // PREVIEW of an email — not an admin control. It was bg-blue-600 while the
                      // compiler sent red, so the one screen whose entire job is showing what the
                      // recipient will get was showing a button colour no recipient ever sees.
                      // Hardcoded rather than tokenised on purpose: the sent email cannot resolve a
                      // CSS variable, so the preview must track the compiler's literal.
                      className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-[#8B1E1E] text-white text-sm font-semibold hover:bg-[#721818] transition-colors shadow-sm"
                    >
                      {ctaBlock.text}
                    </a>
                  </div>
                )}
              </div>
              
              {/* Footer Preview */}
              <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  You are receiving this because you subscribed to our updates.
                </p>
                <div className="mt-2 text-xs text-gray-400 space-x-3">
                  <span className="hover:text-gray-600 cursor-pointer">Unsubscribe</span>
                  <span>•</span>
                  <span className="hover:text-gray-600 cursor-pointer">Preferences</span>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>
      
    </div>
  );
}
