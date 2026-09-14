import { useCallback, useEffect, useRef, useState } from 'react';

/* The Web Speech API isn't in TypeScript's DOM lib (still non-standard --
   shipped vendor-prefixed as `webkitSpeechRecognition` in Chrome/Edge/
   Safari, absent in Firefox), so it's declared locally rather than pulled
   from `lib.dom.d.ts`. */
interface SpeechRecognitionResultItem {
  readonly transcript: string;
}
interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export type VoiceSearchStatus = 'idle' | 'listening' | 'denied' | 'no-speech' | 'unavailable';

interface UseVoiceSearchOptions {
  /** Called with the running transcript as recognition streams it in. */
  onTranscript: (transcript: string) => void;
}

/**
 * One-shot "tap to speak a search term" voice input via the browser's
 * SpeechRecognition API. `supported` is false wherever the API doesn't
 * exist (Firefox, non-secure contexts) -- render nothing rather than a
 * dead mic button in that case.
 */
export function useVoiceSearch({ onTranscript }: UseVoiceSearchOptions) {
  const Ctor = useRef(getRecognitionCtor()).current;
  const supported = Ctor !== null;
  const [status, setStatus] = useState<VoiceSearchStatus>('idle');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!Ctor || recognitionRef.current) return;
    const recognition = new Ctor();
    recognition.lang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i]?.[0]?.transcript ?? '';
      }
      // Chrome infers sentence-ending punctuation on the final result (e.g.
      // "cybersecurity" comes back as "Cybersecurity."), which then fails
      // to substring-match anything in the search index. Strip it.
      transcript = transcript.trim().replace(/[.,!?;:]+$/, '');
      if (transcript) onTranscriptRef.current(transcript);
    };
    recognition.onerror = (e) => {
      setStatus(e.error === 'not-allowed' || e.error === 'permission-denied' ? 'denied' : e.error === 'no-speech' ? 'no-speech' : 'unavailable');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setStatus((s) => (s === 'listening' ? 'idle' : s));
    };

    recognitionRef.current = recognition;
    setStatus('listening');
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setStatus('unavailable');
    }
  }, [Ctor]);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  // Stop the mic the moment the component unmounts (e.g. search closes).
  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { supported, status, listening: status === 'listening', toggle, stop };
}
