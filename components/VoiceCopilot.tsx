'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Loader2, Send } from 'lucide-react';

interface VoiceCopilotProps {
  onVoiceCommand: (text: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceCopilot({ onVoiceCommand, disabled }: VoiceCopilotProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let final = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          final += r[0].transcript;
        } else {
          interimText += r[0].transcript;
        }
      }
      if (final) {
        setTranscript(prev => prev + ' ' + final);
        setInterim('');
      }
      if (interimText) {
        setInterim(interimText);
      }
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setTranscript('');
      setInterim('');
      recognitionRef.current.start();
      setListening(true);
    }
  }, [listening]);

  const send = useCallback(() => {
    const text = transcript.trim();
    if (!text) return;
    onVoiceCommand(text);
    setTranscript('');
    setInterim('');
  }, [transcript, onVoiceCommand]);

  if (!supported) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        onClick={toggle}
        disabled={disabled}
        title={listening ? 'Stop listening' : 'Voice command (ID)'}
        style={{
          width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer', border: 'none',
          background: listening ? 'rgba(255,99,105,0.15)' : 'rgba(124,106,245,0.1)',
          color: listening ? '#FF6369' : '#7C6AF5', opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
          animation: listening ? 'pulse-voice 1.5s ease-in-out infinite' : 'none',
        }}
      >
        {listening ? <MicOff size={15} /> : <Mic size={15} />}
      </button>

      {listening && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.3rem 0.6rem', background: 'var(--color-ground-2)', border: '1px solid var(--color-border)',
          borderRadius: 8, flex: 1, fontSize: '0.75rem', color: 'var(--color-text-primary)',
          minWidth: 150, maxWidth: 300, overflow: 'hidden',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#FF6369', flexShrink: 0,
            animation: 'pulse-dot 0.8s ease-in-out infinite',
          }} />
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {interim ? <em style={{ color: 'var(--color-text-muted)' }}>{interim}</em> : transcript || 'Listening...'}
          </span>
          {transcript.trim() && (
            <button onClick={send} style={{
              padding: '0.15rem 0.35rem', borderRadius: 4, border: 'none', background: '#7C6AF5', color: '#fff',
              cursor: 'pointer', display: 'flex',
            }}>
              <Send size={10} />
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse-voice {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,99,105,0.3); }
          50% { box-shadow: 0 0 0 6px rgba(255,99,105,0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
