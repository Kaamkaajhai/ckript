import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useIsMobile from '../mobile/hooks/useIsMobile';

export default function EventPosterModal() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(() => location.pathname === '/');
  const liveEventId = 'the-final-draft';

  // The native landing already carries the current challenge as an inline,
  // route-aware deadline section. The legacy desktop poster is hard-coded and
  // otherwise paints above the entire native frame, including its dialogs.
  if (isMobile || !isOpen || location.pathname !== '/') return null;

  const handleImageClick = () => {
    setIsOpen(false);
    navigate(`/challenge/c/${liveEventId}`);
  };

  const closeModal = (e) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  const imageSrc = isMobile ? "/new-poster-mobile.png" : "/New-poster-laptop.png";

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
            width: '44px',
            height: '44px',
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
