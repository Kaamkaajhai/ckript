import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useIsMobile from '../mobile/hooks/useIsMobile';

export default function EventPosterModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [liveEventId, setLiveEventId] = useState(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    // Only show once per session so we don't annoy users
    if (sessionStorage.getItem('ckript-event-poster-seen')) {
      return;
    }

    // Hardcoded live event path as requested
    setLiveEventId('the-final-draft');
    setIsOpen(true);
    sessionStorage.setItem('ckript-event-poster-seen', 'true');
  }, []);

  if (!isOpen || !liveEventId) return null;

  const handleImageClick = () => {
    setIsOpen(false);
    navigate(`/challenge/c/${liveEventId}`);
  };

  const closeModal = (e) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  const imageSrc = "/competition-poster.png";

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px'
      }}
      onClick={closeModal}
    >
      <div 
        style={{
          position: 'relative',
          maxWidth: isMobile ? '100%' : '80%',
          maxHeight: '90vh',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleImageClick();
        }}
      >
        <button 
          onClick={closeModal}
          style={{
            position: 'absolute',
            top: '-15px',
            right: '-15px',
            background: 'white',
            color: 'black',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            fontSize: '18px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Close"
        >
          &times;
        </button>
        <img 
          src={imageSrc} 
          alt="Event Poster" 
          style={{
            maxWidth: '100%',
            maxHeight: '85vh',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }} 
        />
      </div>
    </div>
  );
}
