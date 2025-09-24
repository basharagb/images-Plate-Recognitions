import React, { useState } from 'react';
import './AIConfigModal.css';

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  currentApiKey?: string;
}

const AIConfigModal: React.FC<AIConfigModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentApiKey 
}) => {
  const [apiKey, setApiKey] = useState(currentApiKey || '');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
      onClose();
    }
  };

  const handleCancel = () => {
    setApiKey(currentApiKey || '');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>🤖 AI Configuration</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="config-section">
            <h3>OpenAI API Configuration</h3>
            <p>To enable AI-powered license plate recognition, please provide your OpenAI API key.</p>
            
            <div className="input-group">
              <label htmlFor="apiKey">OpenAI API Key:</label>
              <div className="input-with-toggle">
                <input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="api-key-input"
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="info-box">
              <h4>🔒 Security Note:</h4>
              <p>Your API key is stored locally in your browser and is not sent to our servers. 
                 In a production environment, API keys should be managed through a secure backend.</p>
            </div>

            <div className="info-box">
              <h4>📋 How to get an OpenAI API Key:</h4>
              <ol>
                <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI API Keys</a></li>
                <li>Sign in to your OpenAI account</li>
                <li>Click "Create new secret key"</li>
                <li>Copy the key and paste it here</li>
              </ol>
            </div>

            <div className="benefits-box">
              <h4>✨ AI Benefits:</h4>
              <ul>
                <li>🎯 Higher accuracy license plate recognition</li>
                <li>🚗 Vehicle type and color detection</li>
                <li>📍 Better handling of complex traffic scenes</li>
                <li>🌟 Advanced image analysis capabilities</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={handleCancel}>
            Cancel
          </button>
          <button 
            className="save-button" 
            onClick={handleSave}
            disabled={!apiKey.trim()}
          >
            Save & Enable AI
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIConfigModal;
