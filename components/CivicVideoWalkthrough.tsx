'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  RotateCcw,
  Camera,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Award,
  ChevronRight,
  ChevronLeft,
  Flame,
  Radio,
  Video,
  FileCheck,
  Send,
  Users,
  Trophy,
} from 'lucide-react';
import CivicLogo from '@/components/CivicLogo';

interface StepData {
  id: number;
  timeCode: string;
  badge: string;
  title: string;
  subtitle: string;
  narratorVoice: string;
  visualType: 'capture' | 'dedup' | 'repair' | 'leaderboard';
}

const STEPS: StepData[] = [
  {
    id: 1,
    timeCode: '00:08',
    badge: 'Step 1 · Ground Capture',
    title: 'Instant Citizen Geotagging & Defect Detection',
    subtitle: 'Citizen snaps a photo of a road crater or uncollected garbage. The system analyzes severity, detects defect type, and logs GPS coordinates.',
    narratorVoice: '“A citizen photographs a municipal defect. The system instantly pinpoints location, identifies hazard severity, and drafts the grievance in under 2 seconds.”',
    visualType: 'capture',
  },
  {
    id: 2,
    timeCode: '00:19',
    badge: 'Step 2 · Spatial Deduplication',
    title: 'Geo-Spatial Deduplication & Auto Routing',
    subtitle: 'Smart radar clustering detects existing nearby complaints, auto-merges citizen support (+1), and routes directly to the designated Ward Engineer.',
    narratorVoice: '“Instead of flooded duplicate tickets, the system detects identical complaints within 50 meters, aggregates citizen supporters, and escalates priority straight to the Public Works department.”',
    visualType: 'dedup',
  },
  {
    id: 3,
    timeCode: '00:32',
    badge: 'Step 3 · Video Repair Verification',
    title: 'Municipal Repair & Automated Video Audit',
    subtitle: 'Officers execute road restoration. Video inspection verifies the asphalt surface before and after, certifying the fix with concrete audit trails.',
    narratorVoice: '“Municipal authorities carry out asphalt resurfacing. Video inspection conducts frame-by-frame verification to mathematically certify that the pothole is completely resolved.”',
    visualType: 'repair',
  },
  {
    id: 4,
    timeCode: '00:45',
    badge: 'Step 4 · Citizen Consensus & Karma',
    title: 'Community Corroboration & Leaderboard',
    subtitle: 'Nearby citizens verify repair on ground, earn +15 Karma points, and climb the civic leaderboard while email alerts notify reporters.',
    narratorVoice: '“Citizens verify the repair on ground to establish democratic consensus. They earn Karma points, unlock civic badges, and climb the municipal leaderboard.”',
    visualType: 'leaderboard',
  },
];

export default function CivicVideoWalkthrough() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Web Audio API Synthesizer Context
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicIntervalRef = useRef<any>(null);

  // Initialize and play ambient civic soundtrack
  const toggleAudio = () => {
    if (isAudioPlaying) {
      if (audioCtxRef.current) {
        audioCtxRef.current.suspend();
      }
      if (musicIntervalRef.current) {
        clearInterval(musicIntervalRef.current);
      }
      setIsAudioPlaying(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }

        // Play ambient chord sequence
        startProceduralCivicSoundtrack();
        setIsAudioPlaying(true);
      } catch (e) {
        console.warn('Audio playback error:', e);
      }
    }
  };

  // Procedural uplifting ambient civic chord engine
  const startProceduralCivicSoundtrack = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    const playChime = (freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.08) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (err) {
        // ignore
      }
    };

    // Chords: C major 9, F major 7, G major, A minor 7
    const chords = [
      [261.63, 329.63, 392.0, 493.88], // C, E, G, B
      [349.23, 440.0, 523.25, 659.25], // F, A, C, E
      [392.0, 493.88, 587.33, 698.46], // G, B, D, F
      [220.0, 261.63, 329.63, 392.0],  // A, C, E, G
    ];

    let chordIdx = 0;
    const tickChord = () => {
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;
      currentChord.forEach((f, idx) => {
        setTimeout(() => {
          playChime(f, 3.5, 'sine', 0.04);
        }, idx * 180);
      });
      // soft civic bell
      playChime(587.33, 1.8, 'triangle', 0.02);
    };

    tickChord();
    if (musicIntervalRef.current) clearInterval(musicIntervalRef.current);
    musicIntervalRef.current = setInterval(tickChord, 3800);
  };

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen().catch(() => {
            setIsFullscreen(true);
          });
        } else {
          setIsFullscreen(true);
        }
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Auto progression of timeline
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setCurrentStepIndex((curr) => (curr + 1) % STEPS.length);
            return 0;
          }
          return prev + 1.25; // advance smoothly over ~8s per step
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (musicIntervalRef.current) clearInterval(musicIntervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const currentStep = STEPS[currentStepIndex];

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4 sm:p-8 overflow-y-auto'
          : 'relative rounded-3xl overflow-hidden border border-slate-200/90 bg-slate-950 text-white shadow-2xl'
      }`}
    >
      {/* TOP VIDEO PLAYER STATUS BAR */}
      <div className="bg-slate-900/90 backdrop-blur-md px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400">
              LIVE SYSTEM DEMO
            </span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 font-mono">
            <Video className="w-3.5 h-3.5 text-blue-400" />
            <span>Interactive App Walkthrough · Verification Engine</span>
          </div>
        </div>

        {/* Media Controls Header */}
        <div className="flex items-center gap-2.5">
          {/* Music Soundtrack Player Button */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isAudioPlaying
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
            }`}
            title="Toggle Ambient Civic Soundtrack"
          >
            {isAudioPlaying ? (
              <>
                <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                <span>Ambient Music: On</span>
                <span className="flex gap-0.5 items-end h-3 ml-1">
                  <span className="w-0.5 bg-slate-950 h-2 animate-pulse" />
                  <span className="w-0.5 bg-slate-950 h-3 animate-pulse" />
                  <span className="w-0.5 bg-slate-950 h-1.5 animate-pulse" />
                </span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span>Play Civic Music</span>
              </>
            )}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-all cursor-pointer"
            title={isFullscreen ? 'Exit Full Screen' : 'Play Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* MAIN CINEMATIC STAGE */}
      <div className="relative flex-1 min-h-[380px] sm:min-h-[440px] lg:min-h-[480px] bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-slate-950 p-6 sm:p-10 flex flex-col justify-between">
        {/* Step Badge & Title Overlay */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-mono font-bold mb-2">
              <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>{currentStep.badge}</span>
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {currentStep.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              {currentStep.subtitle}
            </p>
          </div>

          <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 font-mono text-xs text-amber-400 font-bold self-start sm:self-auto">
            TIMECODE: {currentStep.timeCode} / 00:45
          </div>
        </div>

        {/* STEP-SPECIFIC DYNAMIC ANIMATED SIMULATION */}
        <div className="my-6 relative z-10">
          {currentStep.visualType === 'capture' && (
            <div className="max-w-2xl mx-auto bg-slate-900/90 border border-blue-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Simulated Camera Viewfinder with AI Bounding Box */}
                <div className="relative w-full sm:w-56 h-48 bg-slate-950 rounded-2xl overflow-hidden border border-white/20 shrink-0 flex items-center justify-center">
                  <div className="absolute inset-0 bg-radial from-slate-800 to-slate-950" />
                  {/* Bounding box for pothole */}
                  <div className="absolute inset-x-8 inset-y-10 border-2 border-dashed border-red-400 bg-red-500/10 rounded-xl flex flex-col justify-between p-2 animate-pulse">
                    <span className="text-[9px] font-mono font-bold bg-red-500 text-white px-1.5 py-0.5 rounded self-start">
                      Pothole (96.4%)
                    </span>
                    <span className="text-[8px] font-mono text-red-200 self-end">
                      Depth: ~8.5cm
                    </span>
                  </div>
                  {/* Viewfinder crosshairs */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-white" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-white" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-white" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-white" />
                  <Camera className="w-8 h-8 text-white/30" />
                </div>

                {/* Telemetry & Multimodal Analysis */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-mono">Geotag Coordinates:</span>
                    <span className="font-mono text-emerald-400 font-bold">28.6139° N, 77.2090° E</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-mono">Ward Zone:</span>
                    <span className="font-bold text-white">Ward 14 (Central District)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-mono">Defect Classification:</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
                      Roads & Asphalt Infrastructure
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">Action:</span>
                    <span className="text-blue-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Generated Ticket #CIV-88421
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep.visualType === 'dedup' && (
            <div className="max-w-2xl mx-auto bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-black/50 p-4 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">Scanning Spatial Proximity</span>
                    <Radio className="w-4 h-4 text-emerald-400 animate-spin" />
                  </div>
                  <div className="h-28 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute w-24 h-24 rounded-full border border-emerald-500/40 animate-ping" />
                    <MapPin className="w-6 h-6 text-red-500 relative z-10" />
                    <span className="absolute bottom-2 text-[9px] font-mono text-emerald-300">
                      Match Found (42m away)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-3">
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-block mb-1">
                      Duplicate Auto-Merged (+1 Support)
                    </span>
                    <h4 className="text-sm font-bold text-white">Aggregated Civic Ticket</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Prevented duplicate contractor work orders. Added photo evidence and escalated urgency to High.
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Total Supporters:</span>
                    <span className="font-mono font-bold text-amber-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> 8 Local Residents
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep.visualType === 'repair' && (
            <div className="max-w-2xl mx-auto bg-slate-900/90 border border-blue-500/40 rounded-3xl p-6 shadow-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono font-bold text-slate-400 block">
                    Before: Defect Detected
                  </span>
                  <div className="h-32 rounded-xl bg-black border border-red-500/30 flex items-center justify-center relative overflow-hidden">
                    <div className="w-16 h-10 bg-red-950/80 rounded-full border border-red-500/50 flex items-center justify-center text-[10px] font-mono text-red-300">
                      Damaged
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center justify-between">
                    <span>After: Video Verified</span>
                    <span className="text-[9px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">
                      99.1% Confidence
                    </span>
                  </span>
                  <div className="h-32 rounded-xl bg-black border border-emerald-500/50 flex items-center justify-center relative overflow-hidden">
                    <div className="w-20 h-10 bg-emerald-950/80 rounded-full border border-emerald-500/60 flex items-center justify-center text-[10px] font-mono text-emerald-300 font-bold">
                      ✓ Restored
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">Automated Status:</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider">
                  Resolved & Video Audited
                </span>
              </div>
            </div>
          )}

          {currentStep.visualType === 'leaderboard' && (
            <div className="max-w-2xl mx-auto bg-slate-900/90 border border-amber-500/40 rounded-3xl p-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shrink-0">
                  <Trophy className="w-8 h-8 animate-bounce" />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      +15 Karma Points Awarded
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white">Community Consensus Confirmed</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Citizen verification vote confirmed the repair was done properly on ground. Ranked up to Level 5 (Master Verifier).
                  </p>
                </div>

                <div className="bg-black/60 p-4 rounded-2xl border border-white/10 text-center shrink-0 min-w-[120px]">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">New Rank</span>
                  <span className="text-2xl font-black font-mono text-amber-400">#1</span>
                  <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">Top Verifier</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* NARRATOR CLOSED CAPTIONS BANNER */}
        <div className="relative z-10 bg-black/70 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-start gap-3 text-xs sm:text-sm text-slate-200">
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <Radio className="w-3.5 h-3.5" />
          </div>
          <p className="italic font-medium leading-relaxed">
            {currentStep.narratorVoice}
          </p>
        </div>
      </div>

      {/* BOTTOM TIMELINE & STEP SELECTOR CONTROLS */}
      <div className="bg-slate-900 px-6 py-4 border-t border-white/10 space-y-4">
        {/* Timeline Scrubber Bar */}
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden relative cursor-pointer">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 transition-all duration-100 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Playback Controls & Steps Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5 text-xs cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isPlaying ? 'Pause Demo' : 'Play Walkthrough'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setProgress(0);
                setCurrentStepIndex((prev) => (prev + 1) % STEPS.length);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10 transition-all text-xs cursor-pointer"
              title="Next Step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Step Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {STEPS.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setCurrentStepIndex(idx);
                  setProgress(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  currentStepIndex === idx
                    ? 'bg-white text-slate-950 font-bold shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                }`}
              >
                0{step.id}: {step.title.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
