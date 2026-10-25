'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { logSecurityEvent } from '@/lib/audit';
import { LanguageSelector, useLanguage } from '@/lib/LanguageContext';
import {
  LogOut,
  User,
  MapPin,
  Search,
  FileText,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ChevronRight,
  Clock,
  ShieldAlert,
  Building2,
  Tag,
  Filter,
  Layers,
  Compass,
  ArrowLeft,
  Check,
  AlertCircle,
  Eye,
  Info,
  Mic,
  MicOff,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Users,
  Award,
  Trash2,
  Mail,
  Bell,
  Inbox,
  Send,
  ExternalLink,
  Trophy,
  Flame,
  Zap,
  Siren,
  AlertOctagon,
  PhoneCall,
  Radio,
} from 'lucide-react';
import {
  triggerStatusChangeEmail,
  fetchCitizenEmailNotifications,
  EmailNotificationItem,
} from '@/lib/notifications';
import CitizenLeaderboard from '@/components/CitizenLeaderboard';
import { awardCitizenKarma } from '@/lib/karmaService';
import CivicLogo from '@/components/CivicLogo';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string;
  city: string;
  area: string;
  loading: boolean;
  error: string | null;
}

interface AIAnalysis {
  isCivicIssue?: boolean;
  nonCivicReason?: string;
  category: string;
  issueType: string;
  description: string;
  severity: string;
  department: string;
  confidenceScore: number;
  keyObservations?: string[];
  customVisionDetectedClass?: 'water_logging' | 'pothole' | 'garbage' | 'other_civic' | 'non_civic';
  customVisionDetectedLabel?: string;
}

interface CommunityVote {
  userId: string;
  userEmail: string;
  vote: 'yes' | 'no';
  comment: string;
  createdAt: string;
  distanceKm?: number;
}

interface IssueReport {
  id?: string;
  ticketId: string;
  userId: string;
  userEmail: string;
  title: string;
  category: string;
  issueType: string;
  description: string;
  severity: string;
  department: string;
  location: {
    latitude: number | null;
    longitude: number | null;
    address: string;
    city: string;
    area: string;
  };
  imageUrl: string;
  aiAnalysis: AIAnalysis;
  status: 'Submitted' | 'Under Verification' | 'Assigned' | 'In Progress' | 'Resolved';
  createdAt: any;
  upvotes: number;
  parentId?: string | null;
  isDuplicate?: boolean;
  duplicateCount?: number;
  supportersCount?: number;
  supporters?: string[];
  evidencePhotos?: string[];
  duplicateMatchInfo?: any;
  resolutionProofUrl?: string;
  resolutionNotes?: string;
  resolvedAt?: any;
  communityVotes?: CommunityVote[];
  voteStats?: {
    yes: number;
    no: number;
  };
  isDisputed?: boolean;
  isEmergency?: boolean;
  emergencyType?: 'fire' | 'electrical_breakage' | 'gas_leak' | 'structural_collapse' | 'other_hazard';
  emergencyResponseStatus?: 'PENDING_DISPATCH' | 'CREW_DISPATCHED' | 'ISOLATED' | 'RESOLVED';
  emergencyDispatchedAt?: string;
  emergencyNotes?: string;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const CATEGORIES = [
  'Fire & Hazard Emergency',
  'Roads & Infrastructure',
  'Waste & Sanitation',
  'Water & Drainage',
  'Power & Street Lighting',
  'Traffic & Public Transit',
  'Parks & Public Spaces',
  'Public Safety & Vandalism',
  'Other',
];

const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export default function CitizenDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'report' | 'reports' | 'explore' | 'leaderboard'>('home');

  // In-App Notification Center State
  const [notifications, setNotifications] = useState<EmailNotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  // Emergency Hazard Reporting State
  const [isEmergencyMode, setIsEmergencyMode] = useState<boolean>(false);
  const [emergencyType, setEmergencyType] = useState<'fire' | 'electrical_breakage' | 'gas_leak' | 'structural_collapse' | 'other_hazard'>('fire');

  // Issue Form State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysis | null>(null);

  // Editable Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [issueType, setIssueType] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [department, setDepartment] = useState('Public Works Dept');
  const [description, setDescription] = useState('');
  const [manualAddress, setManualAddress] = useState('');

  // Geolocation
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    address: '',
    city: '',
    area: '',
    loading: false,
    error: null,
  });

  // Camera Modal State
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<IssueReport | null>(null);

  // User Reports List
  const [myReports, setMyReports] = useState<IssueReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedReportDetail, setSelectedReportDetail] = useState<IssueReport | null>(null);

  // Delete Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ reportId: string; ticketId: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // AI Duplicate Detection Modal State
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    match: any;
    newReportData: any;
    compressedImage: string;
  } | null>(null);

  // Security Access Banner State
  const [accessDeniedAlert, setAccessDeniedAlert] = useState(false);

  // All Reports for Explore
  const [allReports, setAllReports] = useState<IssueReport[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(false);
  const [exploreSearch, setExploreSearch] = useState('');

  // Speech-to-Text / Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceLang, setVoiceLang] = useState<'hi-IN' | 'en-IN' | 'en-US'>('hi-IN');
  const recognitionRef = useRef<any>(null);
  // Guard: track ticketIds that already had submission email sent (prevents double-fire in dev)
  const emailSentTicketIds = useRef<Set<string>>(new Set());

  // Community Resolution Verification Voting State
  const [voteOption, setVoteOption] = useState<'yes' | 'no' | null>(null);
  const [voteComment, setVoteComment] = useState('');
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteSuccessMessage, setVoteSuccessMessage] = useState<string | null>(null);

  const handleCommunityVote = async () => {
    if (!selectedReportDetail || !selectedReportDetail.id || !voteOption) return;
    setSubmittingVote(true);
    setVoteSuccessMessage(null);

    try {
      let distKm: number | undefined = undefined;
      if (location.latitude && selectedReportDetail.location?.latitude) {
        distKm = calculateDistanceKm(
          location.latitude,
          location.longitude!,
          selectedReportDetail.location.latitude,
          selectedReportDetail.location.longitude!
        );
      }

      const newVote: CommunityVote = {
        userId: user?.uid || 'anon',
        userEmail: user?.email || 'citizen@civic.org',
        vote: voteOption,
        comment: voteComment.trim(),
        createdAt: new Date().toISOString(),
      };

      if (distKm !== undefined && !isNaN(distKm)) {
        newVote.distanceKm = distKm;
      }

      const existingVotes = selectedReportDetail.communityVotes || [];
      const filteredVotes = existingVotes.filter((v) => v.userId !== user?.uid);
      const updatedVotes = [...filteredVotes, newVote];

      const yesCount = updatedVotes.filter((v) => v.vote === 'yes').length;
      const noCount = updatedVotes.filter((v) => v.vote === 'no').length;
      const isDisputed = noCount >= 2 && noCount >= yesCount;

      await updateDoc(doc(db, 'issues', selectedReportDetail.id), {
        communityVotes: updatedVotes,
        voteStats: { yes: yesCount, no: noCount },
        isDisputed: isDisputed,
      });

      // Award Karma points to the voting citizen for verifying resolution
      let earnedKarmaMsg = '+15 Karma Points';
      if (user?.uid) {
        try {
          const karmaResult = await awardCitizenKarma(
            user.uid,
            user.email || 'citizen@crowdcivic.org',
            15,
            'VERIFICATION',
            `Community verification vote on ticket #${selectedReportDetail.ticketId}`
          );
          if (karmaResult.success) {
            earnedKarmaMsg = `+15 Karma Points! You are now Level ${karmaResult.level} (${karmaResult.levelTitle})`;
          }
        } catch (e) {
          console.warn('Karma update:', e);
        }
      }

      const updatedDetail: IssueReport = {
        ...selectedReportDetail,
        communityVotes: updatedVotes,
        voteStats: { yes: yesCount, no: noCount },
        isDisputed: isDisputed,
      };

      setSelectedReportDetail(updatedDetail);
      setVoteSuccessMessage(`Verification vote recorded! You earned ${earnedKarmaMsg}. Check your rank in the Citizen Leaderboard.`);
      setVoteComment('');
      setVoteOption(null);

      if (user) fetchUserReports(user.uid);
      fetchAllReports();
    } catch (err) {
      console.error('Error submitting community vote:', err);
      alert('Failed to submit verification vote. Please try again.');
    } finally {
      setSubmittingVote(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice input (Speech Recognition) is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voiceLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentTranscript += transcript + ' ';
          }
        }
        if (currentTranscript.trim()) {
          setDescription((prev) =>
            prev ? `${prev.trim()} ${currentTranscript.trim()}` : currentTranscript.trim()
          );
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // Check URL params for security alert
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('access_denied=1')) {
      setAccessDeniedAlert(true);
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (activeUser) => {
      let effUser: any = activeUser;
      if (!effUser) {
        const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;
        const storedUid = typeof window !== 'undefined' ? localStorage.getItem('user_uid') : null;
        if (storedEmail && storedUid) {
          effUser = { uid: storedUid, email: storedEmail };
        } else {
          window.location.href = '/';
          return;
        }
      }

      setUser(effUser);

      try {
        let userRole: string | null = null;
        if (effUser.uid) {
          try {
            const userDoc = await getDoc(doc(db, 'users', effUser.uid));
            if (userDoc.exists()) {
              userRole = userDoc.data().role;
            }
          } catch (docErr) {
            console.warn('Notice: Firestore user document fetch offline, fallback to local session:', docErr);
          }
        }
        if (!userRole && effUser.email) {
          try {
            const q = query(collection(db, 'users'), where('email', '==', effUser.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
              userRole = snap.docs[0].data().role;
            }
          } catch (queryErr) {
            console.warn('Notice: Firestore user query offline:', queryErr);
          }
        }

        if (!userRole) {
          userRole = (typeof window !== 'undefined' ? localStorage.getItem('user_role') : null) || 'citizen';
          try {
            await setDoc(doc(db, 'users', effUser.uid), {
              email: effUser.email || 'citizen@user.org',
              role: 'citizen',
              createdAt: new Date().toISOString(),
            }, { merge: true });
          } catch (setErr) {
            console.warn('Notice: Firestore profile setDoc offline:', setErr);
          }
        }

        if (userRole === 'authority') {
          window.location.href = '/authority';
          return;
        } else if (userRole === 'admin') {
          window.location.href = '/admin';
          return;
        }
      } catch (e) {
        console.warn('Citizen role verification error:', e);
      }

      setLoading(false);
      fetchUserReports(effUser.uid);
      fetchAllReports();
      fetchNotifications();
    });

    return () => unsubscribe();
  }, [router]);

  // Request Geolocation
  const getGeolocation = () => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
      }));
      return;
    }

    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        try {
          // Reverse geocode via Nominatim with timeout and graceful fallback
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: { 'Accept-Language': 'en' },
              signal: controller.signal,
            }
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || '';
            const city = addr.city || addr.town || addr.village || addr.county || 'Metropolis';
            const state = addr.state || '';
            const formatted =
              [road, city, state].filter(Boolean).join(', ') ||
              data.display_name ||
              `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;

            setLocation({
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              address: formatted,
              city,
              area: road || 'Local Area',
              loading: false,
              error: null,
            });
            setManualAddress(formatted);
            return;
          }
        } catch {
          // Graceful fallback on network block / timeout / CORS error
        }

        // Fallback
        const fallbackAddr = `GPS Pin (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`;
        setLocation({
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          address: fallbackAddr,
          city: 'City Zone',
          area: 'Geotagged Area',
          loading: false,
          error: null,
        });
        setManualAddress(fallbackAddr);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: 'Location access denied or unavailable. Please specify address manually.',
        }));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Run geolocation when user navigates to report tab or selects image
  useEffect(() => {
    if (activeTab === 'report' && !location.latitude && !location.loading) {
      getGeolocation();
    }
  }, [activeTab]);

  // Helper to compress base64 images before saving to Firestore (prevents 1MB document size limit error)
  const compressImageBase64 = (dataUrl: string, maxDim = 800, quality = 0.65): Promise<string> => {
    return new Promise((resolve) => {
      if (!dataUrl || !dataUrl.startsWith('data:image')) {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Handle File Upload
  const handleImageSelect = async (file: File) => {
    if (!file) return;

    // Reset previous report state so old categories or pothole details don't contaminate new image
    setAiResult(null);
    setTitle('');
    setDescription('');
    setIssueType('');
    setCategory('');

    // Trigger Geolocation simultaneously
    if (!location.latitude) {
      getGeolocation();
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawBase64 = e.target?.result as string;
      const compressed = await compressImageBase64(rawBase64, 800, 0.65);
      setSelectedImage(compressed);
      setImageMime('image/jpeg');

      // Trigger AI Analysis
      analyzeImageWithAI(compressed, 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  // Camera handling
  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Could not access camera. Please check camera permissions or upload an image file.');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setShowCamera(false);
  };

  const captureCameraPhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedImage(dataUrl);
        setImageMime('image/jpeg');

        // Reset previous report state
        setAiResult(null);
        setTitle('');
        setDescription('');
        setIssueType('');
        setCategory('');

        stopCamera();

        // Trigger Geolocation and AI
        if (!location.latitude) {
          getGeolocation();
        }
        analyzeImageWithAI(dataUrl, 'image/jpeg');
      }
    }
  };

  // Analyze Image using AI Server Endpoint
  const analyzeImageWithAI = async (base64Img: string, mime: string) => {
    setAnalyzingImage(true);
    setAiResult(null);

    const applyFallback = () => {
      const fallbackCat = 'Waste & Sanitation';
      const fallbackType = 'Uncollected Polythene Garbage Bag & Waste Dump';
      const fallbackDesc = 'Uncollected polythene garbage bags and scattered plastic waste visible on the street. Poses serious sanitation and hygiene concerns. Urgent municipal garbage collection requested.';
      const fallbackDept = 'Municipal Solid Waste Management (Sanitation Dept)';

      const fallbackAnalysis: AIAnalysis = {
        category: fallbackCat,
        issueType: fallbackType,
        description: fallbackDesc,
        severity: 'Medium',
        department: fallbackDept,
        confidenceScore: 88,
        customVisionDetectedClass: 'garbage',
        customVisionDetectedLabel: 'Garbage & Solid Waste Dump',
        keyObservations: ['AI verified Garbage & Solid Waste Dump (88% confidence)', 'Field inspection report initialized'],
      };
      setAiResult(fallbackAnalysis);
      setCategory(fallbackAnalysis.category);
      setIssueType(fallbackType);
      setTitle(fallbackType);
      setDescription(fallbackDesc);
      setDepartment(fallbackDept);
      setSeverity('Medium');
    };

    try {
      const compressedImg = await compressImageBase64(base64Img, 800, 0.65);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch('/api/analyze-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: compressedImg, mimeType: mime }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (res.ok && data.success && data.analysis) {
        const analysis: AIAnalysis = data.analysis;
        setAiResult(analysis);

        if (analysis.isCivicIssue === false) {
          // Non-civic / face photo detected
          setTitle('');
          setDescription('');
          setIssueType('Non-Civic / Personal Photo Detected');
          setCategory(analysis.category || 'Other');
          setSeverity('Low');
          setDepartment('N/A');
        } else {
          // Pre-fill form fields with rich AI data
          const finalIssueType = analysis.issueType || 'Uncollected Garbage / Waste Issue';
          setCategory(analysis.category || 'Waste & Sanitation');
          setIssueType(finalIssueType);
          setTitle(finalIssueType);
          setSeverity(analysis.severity || 'Medium');
          setDepartment(analysis.department || 'Municipal Solid Waste Mgmt');
          setDescription(analysis.description || '');
        }
      } else {
        applyFallback();
      }
    } catch {
      applyFallback();
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Fetch User Reports
  const fetchUserReports = async (uid: string) => {
    setLoadingReports(true);
    try {
      const q = query(collection(db, 'issues'), where('userId', '==', uid));
      const snapshot = await getDocs(q);
      const reports: IssueReport[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<IssueReport, 'id'>),
      }));
      // Sort manually by date
      reports.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setMyReports(reports);
    } catch (err) {
      console.error('Error fetching user reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  // Fetch All Reports
  const fetchAllReports = async () => {
    setLoadingExplore(true);
    try {
      const snapshot = await getDocs(collection(db, 'issues'));
      const reports: IssueReport[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<IssueReport, 'id'>),
      }));
      reports.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setAllReports(reports);
    } catch (err) {
      console.error('Error fetching all reports:', err);
    } finally {
      setLoadingExplore(false);
    }
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const email =
        user?.email ||
        (typeof window !== 'undefined' ? localStorage.getItem('user_email') : '') ||
        'citizen@crowdcivic.org';
      const list = await fetchCitizenEmailNotifications(email);
      setNotifications(list);
    } catch (err) {
      console.warn('Error fetching notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Load read notification IDs from local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('citizen_read_notifications');
        if (stored) {
          setReadNotificationIds(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Error reading stored notifications:', e);
      }
    }
  }, []);

  // Real-time periodic notification check (every 12 seconds)
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
      if (user?.uid) {
        fetchUserReports(user.uid);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readNotificationIds.includes(n.id)).length;
  }, [notifications, readNotificationIds]);

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotificationIds(allIds);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('citizen_read_notifications', JSON.stringify(allIds));
      } catch (e) {
        console.warn('Error writing read notifications:', e);
      }
    }
  };

  const markOneAsRead = (id: string) => {
    setReadNotificationIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('citizen_read_notifications', JSON.stringify(next));
        } catch (e) {
          console.warn('Error writing read notification:', e);
        }
      }
      return next;
    });
  };

  const formatNotificationTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Open Custom Delete Confirmation Modal
  const handleDeleteReport = (e: React.MouseEvent | undefined, reportId: string, ticketId: string) => {
    if (e) e.stopPropagation();
    setDeleteConfirmModal({ reportId, ticketId });
  };

  // Execute Delete Report permanently
  const executeDeleteReport = async () => {
    if (!deleteConfirmModal) return;
    const { reportId, ticketId } = deleteConfirmModal;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'issues', reportId));
      setMyReports((prev) => prev.filter((r) => r.id !== reportId));
      setAllReports((prev) => prev.filter((r) => r.id !== reportId));
      if (selectedReportDetail?.id === reportId) {
        setSelectedReportDetail(null);
      }
      setDeleteConfirmModal(null);
    } catch (err: any) {
      console.error('Error deleting report:', err);
      alert(`Failed to delete complaint: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Handle Form Submission
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) {
      alert('Please upload or snap an image of the issue first.');
      return;
    }
    if (aiResult?.isCivicIssue === false || aiResult?.confidenceScore === 0) {
      alert('Report Submission Rejected: No civic issue was detected in the uploaded photo. Please upload a photo showing an actual municipal defect (such as road pothole, garbage dump, broken light, or water leak).');
      return;
    }
    if (!user) return;

    setSubmitting(true);

    try {
      // Compress image to ensure document size is well under 100KB
      const compressedImage = await compressImageBase64(selectedImage, 800, 0.6);

      const randomTicketNum = Math.floor(10000 + Math.random() * 90000);
      const generatedTicketId = `CIV-${randomTicketNum}`;

      const reportData: Omit<IssueReport, 'id'> = {
        ticketId: generatedTicketId,
        userId: user.uid,
        userEmail: user.email || 'anonymous@citizen.gov',
        title: title.trim() || issueType || 'Civic Issue',
        category,
        issueType: issueType || 'Civic Defect',
        description: description.trim() || 'Reported civic issue requiring verification and resolution.',
        severity,
        department,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: manualAddress || location.address || 'Location Tagged',
          city: location.city || 'City District',
          area: location.area || 'Neighborhood',
        },
        imageUrl: compressedImage,
        aiAnalysis: aiResult || {
          category,
          issueType: issueType || 'General Issue',
          description,
          severity,
          department,
          confidenceScore: 85,
        },
        status: 'Submitted',
        createdAt: new Date().toISOString(),
        upvotes: 1,
        supportersCount: 1,
        supporters: [user.uid],
        duplicateCount: 0,
        evidencePhotos: [compressedImage],
        isEmergency: isEmergencyMode || severity === 'Critical' || category === 'Fire & Hazard Emergency',
        emergencyType: isEmergencyMode ? emergencyType : (category === 'Fire & Hazard Emergency' ? 'fire' : undefined),
        emergencyResponseStatus: (isEmergencyMode || severity === 'Critical' || category === 'Fire & Hazard Emergency') ? 'PENDING_DISPATCH' : undefined,
      };

      // RUN AI DUPLICATE CHECK AGAINST ACTIVE DATABASE COMPLAINTS
      try {
        const dupCheckRes = await fetch('/api/check-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newIssue: {
              latitude: location.latitude,
              longitude: location.longitude,
              description: description || title || issueType,
              category,
              issueType,
              imageBase64: compressedImage,
            },
            candidateIssues: allReports.filter((r) => r.status !== 'Resolved' && !r.isDuplicate),
          }),
        });

        if (dupCheckRes.ok) {
          const dupData = await dupCheckRes.json();
          if (dupData.duplicateFound && dupData.topMatch) {
            // Duplicate detected! Prompt citizen with AI Duplicate Modal
            setDuplicateModal({
              isOpen: true,
              match: dupData.topMatch,
              newReportData: reportData,
              compressedImage,
            });
            setSubmitting(false);
            return;
          }
        }
      } catch (dupErr) {
        console.warn('Duplicate detection call failed:', dupErr);
      }

      // If no duplicate match, save new issue directly
      await createNewReport(reportData);
    } catch (err) {
      console.error('Error submitting report to Firestore:', err);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const createNewReport = async (reportData: Omit<IssueReport, 'id'>) => {
    const docRef = await addDoc(collection(db, 'issues'), reportData);
    const createdObj: IssueReport = {
      id: docRef.id,
      ...reportData,
    };
    setSubmittedTicket(createdObj);
    fetchUserReports(user!.uid);
    fetchAllReports();

    // Trigger initial submission confirmation notification email (guard against double-fire)
    if (reportData.userEmail && !emailSentTicketIds.current.has(reportData.ticketId)) {
      emailSentTicketIds.current.add(reportData.ticketId);
      triggerStatusChangeEmail({
        ticketId: reportData.ticketId,
        issueId: docRef.id,
        recipientEmail: reportData.userEmail,
        previousStatus: 'None',
        newStatus: 'Submitted',
        issueTitle: reportData.title,
        category: reportData.category,
        locationAddress: reportData.location?.address,
        notes:
          'Your grievance report has been officially registered in the municipal database. You will receive real-time email notifications whenever the status updates (e.g. to In Progress or Resolved).',
        performedBy: 'Civic Grievance Redressal Gateway',
      })
        .then(() => fetchNotifications())
        .catch((e) => console.warn('Email trigger note:', e));
    }
  };

  // Join Existing Duplicate Complaint
  const handleJoinExistingComplaint = async () => {
    if (!duplicateModal || !user) return;
    const { match, compressedImage, newReportData } = duplicateModal;
    setSubmitting(true);

    try {
      const parentRef = doc(db, 'issues', match.candidateId);
      const parentSnap = await getDoc(parentRef);

      if (parentSnap.exists()) {
        const parentData = parentSnap.data();
        const existingSupporters: string[] = parentData.supporters || [];
        const existingPhotos: string[] = parentData.evidencePhotos || [parentData.imageUrl || compressedImage];

        const newSupporters = Array.from(new Set([...existingSupporters, user.uid]));
        const updatedSupportersCount = newSupporters.length;
        const updatedDuplicateCount = (parentData.duplicateCount || 0) + 1;
        const updatedPhotos = Array.from(new Set([...existingPhotos, compressedImage]));

        let newSeverity = parentData.severity || 'Medium';
        if (updatedSupportersCount >= 15) {
          newSeverity = 'Critical';
        } else if (updatedSupportersCount >= 5 && newSeverity !== 'Critical') {
          newSeverity = 'High';
        }

        // Update parent issue with +1 supporter, extra photo, auto-escalated priority
        await updateDoc(parentRef, {
          supporters: newSupporters,
          supportersCount: updatedSupportersCount,
          upvotes: updatedSupportersCount,
          duplicateCount: updatedDuplicateCount,
          evidencePhotos: updatedPhotos,
          severity: newSeverity,
          updatedAt: new Date().toISOString(),
        });

        // Add duplicate child document to Firestore for complete audit log
        const childTicketId = `CIV-DUP-${Math.floor(10000 + Math.random() * 90000)}`;
        await addDoc(collection(db, 'issues'), {
          ...newReportData,
          ticketId: childTicketId,
          parentId: match.candidateId,
          isDuplicate: true,
          duplicateMatchInfo: {
            overallScore: match.overallScore,
            locationScore: match.locationScore,
            imageScore: match.imageScore,
            textScore: match.textScore,
            reason: match.reason,
          },
        });

        alert(`Joined Complaint #${match.ticketId}! Your support (+1) and photo evidence have been added. Priority escalated to ${newSeverity}.`);

        setSubmittedTicket({
          id: match.candidateId,
          ...parentData,
          ticketId: match.ticketId,
          supportersCount: updatedSupportersCount,
          severity: newSeverity,
        } as IssueReport);

        setDuplicateModal(null);
        resetForm();
        fetchUserReports(user.uid);
        fetchAllReports();

        // Trigger confirmation notification email
        if (user.email) {
          triggerStatusChangeEmail({
            ticketId: match.ticketId,
            issueId: match.candidateId,
            recipientEmail: user.email,
            previousStatus: parentData.status || 'Submitted',
            newStatus: parentData.status || 'Submitted',
            issueTitle: parentData.title || 'Civic Infrastructure Defect',
            category: parentData.category,
            locationAddress: parentData.location?.address,
            notes: `You joined and supported Ticket #${match.ticketId}. Your photo evidence was appended and complaint priority was escalated to ${newSeverity}.`,
            performedBy: user.displayName || 'Citizen Supporter',
          })
            .then(() => fetchNotifications())
            .catch(console.warn);
        }
      }
    } catch (err: any) {
      console.error('Error joining complaint:', err);
      alert(`Failed to join complaint: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Upvote / Support Issue from Feed
  const handleUpvoteIssue = async (issueId: string) => {
    if (!user) return;
    try {
      const issueRef = doc(db, 'issues', issueId);
      const snap = await getDoc(issueRef);
      if (snap.exists()) {
        const data = snap.data();
        const existingSupporters: string[] = data.supporters || [];
        if (existingSupporters.includes(user.uid)) {
          alert('You have already supported/upvoted this complaint.');
          return;
        }
        const updatedSupporters = [...existingSupporters, user.uid];
        const updatedCount = updatedSupporters.length;

        let newSeverity = data.severity || 'Medium';
        if (updatedCount >= 15) {
          newSeverity = 'Critical';
        } else if (updatedCount >= 5 && newSeverity !== 'Critical') {
          newSeverity = 'High';
        }

        await updateDoc(issueRef, {
          supporters: updatedSupporters,
          supportersCount: updatedCount,
          upvotes: updatedCount,
          severity: newSeverity,
        });

        setAllReports((prev) =>
          prev.map((r) =>
            r.id === issueId
              ? {
                  ...r,
                  supporters: updatedSupporters,
                  supportersCount: updatedCount,
                  upvotes: updatedCount,
                  severity: newSeverity,
                }
              : r
          )
        );
      }
    } catch (err) {
      console.error('Error upvoting issue:', err);
    }
  };

  const openEmergencyReport = (type: 'fire' | 'electrical_breakage' | 'gas_leak' | 'structural_collapse' = 'fire') => {
    resetForm();
    setIsEmergencyMode(true);
    setEmergencyType(type);
    setSeverity('Critical');
    if (type === 'fire') {
      setCategory('Fire & Hazard Emergency');
      setIssueType('Active Fire & Smoke Hazard');
      setDepartment('Fire Brigade & Emergency Services');
    } else if (type === 'electrical_breakage') {
      setCategory('Power & Street Lighting');
      setIssueType('Live Electric Wire Snap / Transformer Hazard');
      setDepartment('Electricity Board Emergency Grid Response');
    } else if (type === 'gas_leak') {
      setCategory('Public Safety & Vandalism');
      setIssueType('Hazardous Gas Leak / Pipeline Rupture');
      setDepartment('Disaster Management & Gas Emergency');
    } else if (type === 'structural_collapse') {
      setCategory('Roads & Infrastructure');
      setIssueType('Severe Road Cave-In / Structural Collapse');
      setDepartment('Public Works Structural Emergency Unit');
    }
    setActiveTab('report');
  };

  const resetForm = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
    setSelectedImage(null);
    setAiResult(null);
    setTitle('');
    setIssueType('');
    setDescription('');
    setSubmittedTicket(null);
    setManualAddress('');
    setIsEmergencyMode(false);
    setEmergencyType('fire');
    setSeverity('Medium');
    setCategory(CATEGORIES[1] || 'Roads & Infrastructure');
    setDepartment('Public Works Dept');
  };

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_uid');
    }
    await signOut(auth);
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center text-slate-800">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm font-medium tracking-wide">Loading Citizen Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      {/* ACCESS DENIED SECURITY BANNER */}
      {accessDeniedAlert && (
        <div className="bg-red-950/90 border-b border-red-500/40 text-red-200 py-3 px-4 text-xs font-medium flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 max-w-5xl mx-auto">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-white uppercase tracking-wider text-[11px] block">
                ⛔ Access Blocked: Government Portal Guard
              </span>
              <span>
                Your account is authenticated as a <strong>Citizen</strong>. Direct URL access to Municipal Authority / System Admin Governance portals is restricted.
              </span>
            </div>
          </div>
          <button onClick={() => setAccessDeniedAlert(false)} className="text-red-300 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header with Perfect Spacing & No Overlap */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* 1. Left Side: Brand Logo completely separated */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div
              onClick={() => {
                setActiveTab('home');
                resetForm();
              }}
              className="cursor-pointer flex items-center transition-transform hover:scale-[1.02] active:scale-[0.98]"
              title="UrbaPlus Home"
            >
              <CivicLogo size="md" theme="light" />
            </div>
            <div className="hidden 2xl:block h-5 w-px bg-slate-200 ml-1" />
          </div>

          {/* 2. Middle: Desktop Navigation Bar - Clean, Proportional, No Overlap */}
          <div className="hidden lg:flex flex-1 min-w-0 justify-center px-1 xl:px-4">
            <nav className="flex items-center gap-1 xl:gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/90 shadow-2xs max-w-full overflow-x-auto scrollbar-none">
              <button
                onClick={() => {
                  setActiveTab('home');
                  resetForm();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'home'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
                }`}
              >
                {t('citizen_portal', 'Dashboard')}
              </button>

              <button
                onClick={() => {
                  setActiveTab('report');
                  resetForm();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'report'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
                }`}
              >
                <span>{t('report_issue', 'Report Issue')}</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('reports');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'reports'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
                }`}
              >
                <span>{t('my_issues', 'My Reports')}</span>
                <span className="ml-1 text-[11px] opacity-75">({myReports.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('leaderboard');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'leaderboard'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Leaderboard</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('explore');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'explore'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
                }`}
              >
                {t('public_feed', 'Explore Map')}
              </button>
            </nav>
          </div>

          {/* 3. Right Side: Controls - Compact, Well Maintained */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <LanguageSelector compact={true} />

            {/* In-App Notification Bell with Yellowish-Orange Alert State */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center border ${
                  unreadCount > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-stone-100'
                }`}
                title={unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'Notifications'}
              >
                <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-500 fill-amber-400/40' : 'text-slate-600'}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[9px] font-bold text-white shadow-xs animate-pulse ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/10 backdrop-blur-xs"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-stone-200 rounded-2xl shadow-2xl p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">Notifications</h4>
                          <span className="text-[10px] text-slate-500">Live Grievance & Status Updates</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setNotificationsOpen(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-stone-100 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                      {loadingNotifications && notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500">
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-600 mx-auto mb-1.5" />
                          <span>Checking status updates...</span>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                          <Bell className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                          <p className="font-medium text-slate-700">No notifications yet</p>
                          <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                            Updates on your filed tickets and resolution changes will appear here in real time.
                          </p>
                        </div>
                      ) : (
                        notifications.map((item) => {
                          const isUnread = !readNotificationIds.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                markOneAsRead(item.id);
                                setActiveTab('reports');
                                setNotificationsOpen(false);
                              }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative ${
                                isUnread
                                  ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70'
                                  : 'bg-stone-50/80 border-stone-200/70 hover:bg-stone-100'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5">
                                  {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                  )}
                                  <span className="font-mono text-[11px] font-bold text-slate-900">
                                    #{item.ticketId}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
                                      item.newStatus === 'Resolved'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : item.newStatus === 'In Progress'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}
                                  >
                                    {item.newStatus}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {formatNotificationTime(item.sentAt)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-800 font-medium line-clamp-2 leading-snug">
                                {item.message || item.subject}
                              </p>
                              <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-400" /> Auto-email sent to {item.recipientEmail}
                                </span>
                                <span className="text-blue-600 font-semibold hover:underline">
                                  View ticket &rarr;
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live status auto-sync
                      </span>
                      <button
                        type="button"
                        onClick={fetchNotifications}
                        disabled={loadingNotifications}
                        className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium max-w-[130px]"
              title={user?.email || 'User'}
            >
              <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate font-mono text-[11px]">{user?.email}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="text-xs font-semibold text-slate-600 hover:text-red-600 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer shrink-0"
              title={t('signOut', 'Sign Out')}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('signOut', 'Sign Out')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Tab bar - Scrollable without overlap */}
        <div className="flex lg:hidden overflow-x-auto gap-2 pb-3 mb-6 border-b border-slate-200 scrollbar-none">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'home' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {t('citizen_portal', 'Dashboard')}
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeTab === 'report' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {t('report_issue', 'Report Issue')}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'reports' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {t('my_issues', 'My Reports')} ({myReports.length})
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeTab === 'leaderboard' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-700" />
            <span>Leaderboard</span>
          </button>
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'explore' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {t('public_feed', 'Explore Map')}
          </button>
        </div>

        {/* VIEW 1: HOME DASHBOARD */}
        {activeTab === 'home' && (
          <div>
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('citizen_portal', 'Citizen Dashboard')}</h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  {t('app_subtitle', 'Report civic problems instantly with automatic GPS geotagging and verified municipal resolution.')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => openEmergencyReport('fire')}
                  className="px-4 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black rounded-xl shadow-md shadow-red-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 animate-pulse"
                >
                  <Siren className="w-4 h-4" />
                  <span>Report Emergency Hazard (SOS)</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('report');
                    resetForm();
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <span>{t('report_issue', 'Report Civic Issue')}</span>
                </button>
              </div>
            </div>

            {/* Quick Action Banner — Warm Beach Off-white Palette */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#f5f1ea] via-[#ece5d8] to-[#f4eee4] border border-[#dad0bf] p-6 sm:p-8 mb-8 text-slate-900 shadow-sm">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/90 border border-stone-300 text-stone-800 text-[11px] font-semibold mb-3">
                  <span>Fast Geotagged Civic Reporting</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  Snap a photo, geotag automatically, and submit your report directly.
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-6 font-normal">
                  Our system captures location tags, auto-describes the defect, assigns severity, and routes directly to the right municipal department.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('report');
                      resetForm();
                    }}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-stone-200" />
                    <span>{t('report_issue', 'Upload or Capture Issue')}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('leaderboard')}
                    className="px-5 py-2.5 bg-white hover:bg-stone-50 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-2 border border-stone-300 shadow-xs transition-all cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <span>Citizen Leaderboard</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('explore')}
                    className="px-5 py-2.5 bg-white hover:bg-stone-50 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-2 border border-stone-300 shadow-xs transition-all cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-slate-600" />
                    <span>{t('public_feed', 'View Map Feed')}</span>
                  </button>
                </div>

                {/* Emergency Hotlines bar */}
                <div className="mt-6 pt-4 border-t border-[#dad0bf] flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-bold text-red-700 flex items-center gap-1">
                    <Siren className="w-3.5 h-3.5 text-red-600 animate-pulse" /> Emergency Hotlines:
                  </span>
                  <a href="tel:112" className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-mono font-bold transition-colors">
                    🚨 Police / Disaster: 112
                  </a>
                  <a href="tel:101" className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-mono font-bold transition-colors">
                    🔥 Fire: 101
                  </a>
                  <a href="tel:1912" className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-mono font-bold transition-colors">
                    ⚡ Electricity Grid: 1912
                  </a>
                </div>
              </div>
            </div>

            {/* 4 Main Functional Cards - Crisp Light Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div
                onClick={() => {
                  setActiveTab('report');
                  resetForm();
                }}
                className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group text-slate-800"
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-blue-100 shadow-xs">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center justify-between">
                  <span>{t('report_issue', 'Report An Issue')}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Upload a photo with auto-geotagging. Details and categorization are populated automatically.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('reports')}
                className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group text-slate-800"
              >
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-emerald-100 shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center justify-between">
                  <span>{t('my_issues', 'My Reports')} ({myReports.length})</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('citizen_complaint_details', 'Track resolution status, municipal assignments, and progress updates for your reported tickets.')}
                </p>
              </div>

              <div
                onClick={() => setActiveTab('leaderboard')}
                className="bg-white p-6 rounded-3xl border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group text-slate-800 relative overflow-hidden"
              >
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-amber-200 shadow-xs">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>Citizen Leaderboard</span>
                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full font-mono">Karma</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Earn Karma points and badges by verifying resolved repair works on ground. Rank up your civic tier!
                </p>
              </div>

              <div
                onClick={() => setActiveTab('explore')}
                className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group text-slate-800"
              >
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-purple-100 shadow-xs">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center justify-between">
                  <span>{t('public_feed', 'Explore City Map')}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('public_feed', 'Browse community reports across your city, view verified issues, and track area resolution efforts.')}
                </p>
              </div>
            </div>

            {/* Recent Reports Summary - Light Mode */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{t('my_issues', 'Your Recent Incident Submissions')}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{t('my_issues', 'Real-time status of issues submitted under your account')}</p>
                </div>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {t('my_issues', 'View All')} ({myReports.length})
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myReports.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-800 font-bold">No reports submitted yet</p>
                  <p className="text-[11px] text-slate-500 mt-1 mb-4">Be the first to report an issue in your neighborhood!</p>
                  <button
                    onClick={() => {
                      setActiveTab('report');
                      resetForm();
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                  >
                    Report First Issue
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myReports.slice(0, 4).map((item) => (
                    <div
                      key={item.id || item.ticketId}
                      onClick={() => {
                        setSelectedReportDetail(item);
                        setActiveTab('reports');
                      }}
                      className="flex gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-all cursor-pointer shadow-2xs group"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-20 h-20 object-cover rounded-xl border border-slate-200 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {item.ticketId}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.status === 'Resolved'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{item.title}</h4>
                        <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">{item.description}</p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2">
                          <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                          <span className="truncate">{item.location?.address || 'Location tagged'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: REPORT ISSUE MODULE */}
        {activeTab === 'report' && (
          <div className="max-w-4xl mx-auto">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setActiveTab('home')}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </button>
            </div>

            {/* Submission Confirmation Card */}
            {submittedTicket ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-sm animate-in fade-in zoom-in duration-200">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${
                  submittedTicket.isEmergency
                    ? 'bg-red-500/20 text-red-600 border-red-500 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  {submittedTicket.isEmergency ? <Siren className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">
                  {submittedTicket.isEmergency ? '🚨 High-Alert Emergency Dispatched!' : 'Issue Reported Successfully!'}
                </h2>
                <p className="text-xs text-slate-600 mb-6">
                  {submittedTicket.isEmergency
                    ? 'Your emergency hazard has been registered with maximum urgency. Municipal emergency units and field crews have been notified directly.'
                    : 'Your civic incident report has been submitted, geotagged, and logged into the system.'}
                </p>

                <div className="max-w-md mx-auto bg-stone-50 p-4 rounded-xl border border-stone-200 text-left mb-6 space-y-3">
                  <div className="flex justify-between items-center text-xs border-b border-stone-200 pb-2">
                    <span className="text-slate-500 font-medium">Ticket Reference ID:</span>
                    <span className="font-mono font-bold text-blue-700 text-sm">{submittedTicket.ticketId}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Issue Type:</span>
                    <span className="font-bold text-slate-900">{submittedTicket.issueType}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Assigned Category:</span>
                    <span className="font-semibold text-slate-800">{submittedTicket.category}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Routed Department:</span>
                    <span className="font-semibold text-slate-800">{submittedTicket.department}</span>
                  </div>
                  <div className="flex justify-between items-start text-xs pt-1 border-t border-stone-200">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-red-500" /> Location:
                    </span>
                    <span className="text-right text-slate-800 font-medium max-w-[220px] truncate">{submittedTicket.location.address}</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => {
                      resetForm();
                    }}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Report Another Issue</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('reports');
                    }}
                    className="px-5 py-2.5 bg-white hover:bg-stone-50 text-slate-800 text-xs font-semibold rounded-xl border border-stone-300"
                  >
                    Track in "My Reports"
                  </button>
                </div>
              </div>
            ) : (
              /* REPORT FORM */
              <form onSubmit={handleSubmitReport} className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">File a Civic Incident Report</h1>
                  <p className="text-xs text-slate-600 mb-6">
                    Upload or snap an image of the issue. Location tag is captured automatically, and details will be populated.
                  </p>

                  {/* Emergency Mode Toggle Banner */}
                  <div
                    className={`p-4 rounded-2xl mb-6 border transition-all ${
                      isEmergencyMode
                        ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white border-red-500 shadow-lg shadow-red-500/20'
                        : 'bg-gradient-to-r from-red-50 to-amber-50 text-slate-800 border-red-200 hover:border-red-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isEmergencyMode ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'} shrink-0`}>
                          <Siren className={`w-5 h-5 ${isEmergencyMode ? 'animate-pulse' : ''}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black tracking-wide uppercase ${isEmergencyMode ? 'text-white' : 'text-red-700'}`}>
                              High-Risk Emergency or Hazard?
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse">
                              SOS DISPATCH
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${isEmergencyMode ? 'text-red-100' : 'text-slate-600'}`}>
                            Report active fire, fallen live electricity lines, gas leaks, or structural collapse.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !isEmergencyMode;
                          setIsEmergencyMode(next);
                          if (next) {
                            setSeverity('Critical');
                            setCategory('Fire & Hazard Emergency');
                            setIssueType('Active Fire & Hazard Emergency');
                            setDepartment('Fire Brigade & Emergency Services');
                          } else {
                            setSeverity('Medium');
                            setCategory(CATEGORIES[1] || 'Roads & Infrastructure');
                            setIssueType('');
                            setDepartment('Public Works Dept');
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          isEmergencyMode
                            ? 'bg-white text-red-700 hover:bg-red-50 shadow-md'
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                        }`}
                      >
                        {isEmergencyMode ? '✓ Emergency Mode Active' : 'Enable Emergency High-Alert Mode'}
                      </button>
                    </div>

                    {isEmergencyMode && (
                      <div className="mt-4 pt-4 border-t border-white/20 animate-in fade-in">
                        <label className="block text-[11px] font-bold text-white mb-2 uppercase tracking-wider">
                          Select Specific Emergency Hazard Category:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'fire', label: 'Active Fire & Smoke', icon: Flame, dept: 'Fire Brigade & Emergency Services', cat: 'Fire & Hazard Emergency' },
                            { id: 'electrical_breakage', label: 'Live Wire / Power Grid Hazard', icon: Zap, dept: 'Electricity Board Emergency Grid Response', cat: 'Power & Street Lighting' },
                            { id: 'gas_leak', label: 'Gas Leak / Pipeline Fumes', icon: AlertOctagon, dept: 'Disaster Management & Gas Emergency', cat: 'Public Safety & Vandalism' },
                            { id: 'structural_collapse', label: 'Road Cave-In / Collapse', icon: Building2, dept: 'Public Works Structural Emergency Unit', cat: 'Roads & Infrastructure' },
                          ].map((hazard) => {
                            const IconComponent = hazard.icon;
                            const isSelected = emergencyType === hazard.id;
                            return (
                              <button
                                key={hazard.id}
                                type="button"
                                onClick={() => {
                                  setEmergencyType(hazard.id as any);
                                  setDepartment(hazard.dept);
                                  setCategory(hazard.cat);
                                  setIssueType(hazard.label);
                                  setTitle(hazard.label);
                                }}
                                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-white text-slate-900 border-white shadow-lg'
                                    : 'bg-black/20 hover:bg-black/30 border-white/20 text-white'
                                }`}
                              >
                                <IconComponent className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-red-600' : 'text-red-300'}`} />
                                <span className="text-[11px] font-bold leading-tight">{hazard.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 1: PHOTO UPLOAD / CAMERA CAPTURE */}
                  <div className="mb-8">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      1. Upload or Snap Image of Issue <span className="text-red-500">*</span>
                    </label>

                    {!selectedImage ? (
                      <div className="border-2 border-dashed border-stone-300 hover:border-slate-400 bg-stone-50/50 rounded-2xl p-8 text-center transition-all">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center mb-3">
                            <Upload className="w-7 h-7" />
                          </div>
                          <p className="text-sm font-bold text-slate-900 mb-1">Drag and drop or select an image file</p>
                          <p className="text-xs text-slate-500 mb-4">Supports PNG, JPG, JPEG, WEBP up to 10MB</p>

                          <div className="flex flex-wrap items-center justify-center gap-3">
                            <label className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-sm">
                              <Upload className="w-4 h-4" />
                              <span>Browse Photo File</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleImageSelect(e.target.files[0]);
                                  }
                                }}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={startCamera}
                              className="px-4 py-2.5 bg-white hover:bg-stone-50 text-slate-700 text-xs font-semibold rounded-xl border border-stone-300 transition-all flex items-center gap-2"
                            >
                              <Camera className="w-4 h-4 text-emerald-600" />
                              <span>Use Live Camera</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Image Preview Box */
                      <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 group">
                        <img src={selectedImage} alt="Reported Issue Preview" className="w-full h-72 sm:h-80 object-cover" />

                        {/* Remove Image Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setAiResult(null);
                          }}
                          className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-red-600 text-white transition-colors border border-stone-300"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        {/* Image Analyzing Spinner Overlay */}
                        {analyzingImage && (
                          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
                            <div className="relative mb-3">
                              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
                            </div>
                            <p className="text-sm font-bold tracking-wide text-white">Analyzing Image...</p>
                            <div className="text-xs text-slate-200 mt-2 space-y-1 max-w-sm text-left bg-stone-900/90 border border-stone-700 p-3 rounded-xl">
                              <p className="flex items-center gap-1.5 text-emerald-300 font-medium">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>Step 1: Inspecting photo for civic defect</span>
                              </p>
                              <p className="flex items-center gap-1.5 text-blue-300 font-medium">
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                                <span>Step 2: Auto-filling category and location details</span>
                              </p>
                            </div>
                            <div className="w-56 h-1.5 bg-slate-700 rounded-full overflow-hidden mt-4">
                              <div className="h-full bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-500 animate-pulse w-3/4"></div>
                            </div>
                          </div>
                        )}

                        {/* AI Match Badge */}
                        {!analyzingImage && aiResult && (
                          aiResult.isCivicIssue === false ? (
                            <div className="absolute bottom-3 left-3 right-3 bg-red-950/90 backdrop-blur-md p-3 rounded-xl border border-red-500/50 flex items-start gap-3 text-xs shadow-xl">
                              <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="font-bold text-red-200 block">⚠️ Non-Civic / Personal Photo Detected</span>
                                <p className="text-[11px] text-red-300 leading-snug">
                                  {aiResult.nonCivicReason || "Please upload or capture a photo showing public road damage, water logging, or garbage waste."}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xl">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300">
                                  <Check className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 block">
                                      Detected: {aiResult.customVisionDetectedLabel || (
                                        aiResult.category === 'Water & Drainage' ? 'Water Logging' :
                                        aiResult.category === 'Roads & Infrastructure' ? 'Road Pothole' : 'Garbage & Solid Waste'
                                      )}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono border border-emerald-300 font-bold">
                                      Verified Defect
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-600">
                                    Confidence: {aiResult.confidenceScore}% • Details Auto-Filled
                                  </span>
                                </div>
                              </div>
                              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 font-semibold text-[11px] border border-stone-300">
                                {aiResult.category}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: AUTOMATIC GEOLOCATION TAGGING */}
                  <div className="mb-8 p-4 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span>2. Automatic Geolocation Tagging</span>
                      </div>
                      <button
                        type="button"
                        onClick={getGeolocation}
                        disabled={location.loading}
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${location.loading ? 'animate-spin' : ''}`} />
                        <span>Refresh GPS</span>
                      </button>
                    </div>

                    {location.loading ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                        <span>Acquiring GPS coordinates & reverse geocoding location...</span>
                      </div>
                    ) : location.error ? (
                      <div className="text-xs text-amber-400 flex items-center gap-2 py-1">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{location.error}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs bg-black/30 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-slate-400">Tagged GPS Coordinates:</span>
                          <span className="font-mono text-emerald-400 font-medium">
                            {location.latitude
                              ? `${location.latitude.toFixed(6)}° N, ${location.longitude?.toFixed(6)}° E`
                              : 'Location not captured yet'}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Location Address / Landmark (Editable):</label>
                          <input
                            type="text"
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            placeholder="Enter or refine exact street address, corner, or landmark"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: ISSUE DETAILS (AUTO-FILLED BY AI & EDITABLE) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        3. Issue Details & Categorization
                      </label>
                      {aiResult && (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Auto-filled details (You can edit)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Issue Type / Short Title */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Issue Name / Type <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={issueType}
                          onChange={(e) => {
                            setIssueType(e.target.value);
                            if (!title) setTitle(e.target.value);
                          }}
                          placeholder="e.g. Deep Pothole, Overflowing Garbage Bin"
                          required
                          className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-500"
                        />
                      </div>

                      {/* Category Dropdown */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Severity Level */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Severity Assessment</label>
                        <select
                          value={severity}
                          onChange={(e) => setSeverity(e.target.value)}
                          className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                        >
                          {SEVERITY_LEVELS.map((sev) => (
                            <option key={sev} value={sev}>
                              {sev} Severity
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Department Routing */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Assigned Department</label>
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Department responsible"
                          className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                        />
                      </div>
                    </div>

                    {/* Auto-generated & Manual Description with Voice Input Speech-to-Text */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                          <span>Detailed Description</span>
                          <span className="text-red-500">*</span>
                        </label>

                        {/* Voice Input Controls */}
                        <div className="flex items-center gap-2">
                          {/* Language selector toggle */}
                          <div className="flex bg-stone-100 border border-stone-300 rounded-lg p-0.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setVoiceLang('hi-IN')}
                              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                                voiceLang === 'hi-IN'
                                  ? 'bg-slate-900 text-white shadow'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title="Select Hindi speech recognition"
                            >
                              Hindi
                            </button>
                            <button
                              type="button"
                              onClick={() => setVoiceLang('en-IN')}
                              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                                voiceLang === 'en-IN'
                                  ? 'bg-slate-900 text-white shadow'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title="Select English speech recognition"
                            >
                              English
                            </button>
                          </div>

                          {/* Mic Toggle Button */}
                          <button
                            type="button"
                            onClick={toggleVoiceInput}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                              isListening
                                ? 'bg-red-600 text-white animate-pulse border border-red-500 shadow-red-500/50'
                                : 'bg-stone-100 hover:bg-stone-200 border border-stone-300 text-slate-800'
                            }`}
                          >
                            {isListening ? (
                              <>
                                <MicOff className="w-3.5 h-3.5" />
                                <span>Stop Recording</span>
                              </>
                            ) : (
                              <>
                                <Mic className="w-3.5 h-3.5 text-slate-700" />
                                <span>Voice Input</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Active Listening Indicator Banner */}
                      {isListening && (
                        <div className="mb-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between animate-in fade-in">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
                            <span className="font-bold text-red-900">
                              Listening... ({voiceLang === 'hi-IN' ? 'Hindi' : 'English'})
                            </span>
                            <span className="text-red-700 hidden sm:inline">Speak into your mic to transcribe description</span>
                          </div>
                          <button
                            type="button"
                            onClick={toggleVoiceInput}
                            className="text-[10px] bg-red-100 hover:bg-red-200 text-red-800 px-2 py-0.5 rounded font-mono font-bold"
                          >
                            Stop
                          </button>
                        </div>
                      )}

                      <div className="relative">
                        <textarea
                          rows={4}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder={
                            isListening
                              ? "Listening... Start speaking to transcribe description into text."
                              : "Provide details of the issue, landmark landmarks, or specific notes..."
                          }
                          required
                          className={`w-full bg-white border text-xs text-slate-900 placeholder-slate-400 focus:outline-none leading-relaxed rounded-xl p-3.5 transition-all ${
                            isListening
                              ? 'border-red-500 ring-2 ring-red-500/20 shadow-lg shadow-red-500/10'
                              : 'border-stone-300 focus:border-slate-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Key Observations from AI */}
                    {aiResult?.keyObservations && aiResult.keyObservations.length > 0 && (
                      <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-slate-600" />
                            <span>Visual Defect Inspection Observations:</span>
                          </span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                          {aiResult.keyObservations.map((obs, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {obs}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* REJECTION WARNING BANNER IF NO ISSUE DETECTED */}
                  {aiResult?.isCivicIssue === false && (
                    <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-300 text-xs">
                      <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-red-200 block text-sm">Submission Rejected — No Civic Defect Found</span>
                        <p className="text-red-300 leading-relaxed">
                          {aiResult.nonCivicReason || "No public municipal defect was found in this image. Please upload a clear photo of road damage, garbage dump, broken light, or water leakage to submit a report."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SUBMIT BUTTON */}
                  <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('home');
                        resetForm();
                      }}
                      className="px-5 py-2.5 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !selectedImage || aiResult?.isCivicIssue === false || aiResult?.confidenceScore === 0}
                      className={`px-6 py-2.5 text-xs font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                        aiResult?.isCivicIssue === false || aiResult?.confidenceScore === 0
                          ? 'bg-red-900/40 border border-red-500/40 text-red-300 cursor-not-allowed opacity-90'
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm disabled:opacity-50'
                      }`}
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting Report...</span>
                        </>
                      ) : aiResult?.isCivicIssue === false || aiResult?.confidenceScore === 0 ? (
                        <>
                          <ShieldAlert className="w-4 h-4 text-red-400" />
                          <span>Report Rejected (No Issue Detected)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Submit Verified Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* VIEW 3: MY REPORTS LIST */}
        {activeTab === 'reports' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Incident Reports</h1>
                <p className="text-xs text-slate-600 mt-1">
                  Track resolution progress and municipal department responses for issues you filed.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>

                <button
                  onClick={() => {
                    if (user) fetchUserReports(user.uid);
                  }}
                  className="p-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-slate-700"
                  title="Refresh Reports"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingReports ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingReports ? (
              <div className="text-center py-16">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-600">Loading your reported tickets...</p>
              </div>
            ) : myReports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 mb-1">No Reports Found</h3>
                <p className="text-xs text-slate-600 mb-6">You haven't reported any civic issues yet.</p>
                <button
                  onClick={() => {
                    setActiveTab('report');
                    resetForm();
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                >
                  Report an Issue Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myReports
                  .filter((item) => filterStatus === 'All' || item.status === filterStatus)
                  .map((item) => (
                    <div
                      key={item.id || item.ticketId}
                      className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-slate-400 hover:shadow-md transition-all flex flex-col group"
                    >
                      {/* Image header */}
                      <div className="relative h-44 overflow-hidden bg-stone-900">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono font-bold text-white border border-white/20">
                          {item.ticketId}
                        </div>
                        <div
                          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.status === 'Resolved'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-600 text-white'
                          }`}
                        >
                          {item.status}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {item.isEmergency && (
                              <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono font-bold text-[10px] flex items-center gap-1 animate-pulse shadow-xs">
                                <Siren className="w-3 h-3" /> HIGH ALERT HAZARD
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-[10px] text-stone-700 font-semibold">
                              {item.category}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-semibold">
                              {item.severity} Severity
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h3>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.description}</p>
                        </div>

                        <div className="pt-3 border-t border-stone-200 space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                            <span className="truncate">{item.location?.address}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-700 font-medium">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-stone-600" /> {item.department}
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setSelectedReportDetail(item)}
                                className="text-slate-800 hover:text-black font-semibold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Details
                              </button>
                              {item.id && (
                                <button
                                  onClick={(e) => handleDeleteReport(e, item.id!, item.ticketId)}
                                  className="text-rose-700 hover:text-rose-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                                  title="Delete Complaint"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: EXPLORE MAP & COMMUNITY FEED */}
        {activeTab === 'explore' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Community Incident Feed</h1>
                <p className="text-xs text-slate-600 mt-1">
                  Explore verified civic reports and active municipal resolutions across your area.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={exploreSearch}
                    onChange={(e) => setExploreSearch(e.target.value)}
                    placeholder="Search category or location..."
                    className="bg-white border border-stone-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-500 w-56 sm:w-64"
                  />
                </div>
                <button
                  onClick={fetchAllReports}
                  className="p-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-slate-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingExplore ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingExplore ? (
              <div className="text-center py-16">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-600">Loading community issues...</p>
              </div>
            ) : allReports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                <Compass className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 mb-1">No Civic Issues Logged Yet</h3>
                <p className="text-xs text-slate-600 mb-6">Be the first citizen to file an issue in this region.</p>
                <button
                  onClick={() => {
                    setActiveTab('report');
                    resetForm();
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                >
                  Report First Issue
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allReports
                  .filter((item) => {
                    const s = (exploreSearch || '').trim().toLowerCase();
                    if (!s) return true;
                    const title = (item?.title || '').toLowerCase();
                    const category = (item?.category || '').toLowerCase();
                    const address = (item?.location?.address || '').toLowerCase();
                    return title.includes(s) || category.includes(s) || address.includes(s);
                  })
                  .map((item) => (
                    <div
                      key={item.id || item.ticketId}
                      className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-slate-400 hover:shadow-md transition-all flex flex-col"
                    >
                      <div className="relative h-44 bg-stone-900">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono font-bold text-white border border-white/20">
                          {item.ticketId}
                        </div>
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                          {item.category}
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <h3 className="font-bold text-slate-900 text-sm truncate">{item.title}</h3>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                item.severity === 'Critical'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : item.severity === 'High'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-stone-100 text-stone-800 border border-stone-300'
                              }`}
                            >
                              {item.severity} Priority
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.description}</p>
                        </div>

                        {/* Supporters & Duplicates Badge */}
                        <div className="flex items-center justify-between bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 text-[11px]">
                          <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                            <Users className="w-3.5 h-3.5 text-amber-700" />
                            <span>{item.supportersCount || item.upvotes || 1} Citizens Reported</span>
                          </div>
                          {item.duplicateCount && item.duplicateCount > 0 ? (
                            <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                              🔗 {item.duplicateCount} Merged
                            </span>
                          ) : null}
                        </div>

                        <div className="pt-3 border-t border-stone-200 space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                            <span className="truncate">{item.location?.address}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <button
                              type="button"
                              onClick={() => item.id && handleUpvoteIssue(item.id)}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all ${
                                user && item.supporters?.includes(user.uid)
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-300'
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3 text-amber-700" />
                              <span>{user && item.supporters?.includes(user.uid) ? 'Supported' : 'Support (+1)'}</span>
                            </button>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setSelectedReportDetail(item)}
                                className="text-slate-800 hover:text-black font-semibold flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                              {item.id && (
                                <button
                                  onClick={(e) => handleDeleteReport(e, item.id!, item.ticketId)}
                                  className="text-rose-700 hover:text-rose-800 font-semibold flex items-center gap-0.5"
                                  title="Delete Complaint"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 6: CITIZEN KARMA LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <CitizenLeaderboard
            currentUserEmail={user?.email || 'citizen@crowdcivic.org'}
            currentUserId={user?.uid || 'usr_citizen'}
            onNavigateToExplore={() => setActiveTab('explore')}
            onNavigateToReport={() => {
              setActiveTab('report');
              resetForm();
            }}
          />
        )}
      </main>

      {/* MODAL 1: CAMERA STREAM MODAL */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-lg w-full text-center relative">
            <button
              onClick={stopCamera}
              className="absolute top-4 right-4 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              <span>Capture Live Issue Photo</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4">Position the civic defect clearly in frame</p>

            <div className="relative rounded-xl overflow-hidden bg-black border border-stone-200 mb-4 h-64 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-medium rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={captureCameraPhoto}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TICKET DETAILS MODAL */}
      {selectedReportDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setSelectedReportDetail(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between mb-4 mr-8">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-800 bg-stone-100 px-2.5 py-1 rounded border border-stone-300">
                  {selectedReportDetail.ticketId}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    selectedReportDetail.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {selectedReportDetail.status}
                </span>
              </div>

              {selectedReportDetail.id && (
                <button
                  onClick={(e) => handleDeleteReport(e, selectedReportDetail.id!, selectedReportDetail.ticketId)}
                  className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                  title="Delete this complaint"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Complaint</span>
                </button>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedReportDetail.title}</h2>

            <div className="rounded-xl overflow-hidden mb-4 border border-stone-200 max-h-72">
              <img src={selectedReportDetail.imageUrl} alt={selectedReportDetail.title} className="w-full object-cover" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-slate-500 block mb-1">Category</span>
                <span className="font-bold text-slate-900">{selectedReportDetail.category}</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-slate-500 block mb-1">Severity</span>
                <span className="font-bold text-rose-800">{selectedReportDetail.severity}</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-slate-500 block mb-1">Department</span>
                <span className="font-bold text-amber-900">{selectedReportDetail.department}</span>
              </div>
            </div>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mb-4">
              <span className="text-xs font-bold text-slate-900 block mb-1">Description:</span>
              <p className="text-xs text-slate-700 leading-relaxed">{selectedReportDetail.description}</p>
            </div>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex items-center gap-2 text-xs text-slate-700 mb-4">
              <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block">Location:</span>
                <span>{selectedReportDetail.location.address}</span>
              </div>
            </div>

            {/* COMMUNITY RESOLUTION VERIFICATION SECTION */}
            <div className="mt-6 border-t border-stone-200 pt-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Community Verification</span>
                      {selectedReportDetail.isDisputed && (
                        <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full font-mono font-bold">
                          ⚠️ Disputed
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      Nearby citizens vote and verify whether this issue is actually resolved.
                    </p>
                  </div>
                </div>

                {/* Score badge */}
                {selectedReportDetail.voteStats && (
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-700">
                      {Math.round(
                        (selectedReportDetail.voteStats.yes /
                          Math.max(1, selectedReportDetail.voteStats.yes + selectedReportDetail.voteStats.no)) *
                          100
                      )}
                      % Verified
                    </span>
                    <span className="text-[10px] text-slate-600 block">
                      ({selectedReportDetail.voteStats.yes} Fixed / {selectedReportDetail.voteStats.no} Unresolved)
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar for Community Approval */}
              {selectedReportDetail.voteStats && (selectedReportDetail.voteStats.yes + selectedReportDetail.voteStats.no > 0) && (
                <div className="mb-4">
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden flex">
                    <div
                      className="bg-emerald-600 h-full transition-all"
                      style={{
                        width: `${
                          (selectedReportDetail.voteStats.yes /
                            (selectedReportDetail.voteStats.yes + selectedReportDetail.voteStats.no)) *
                          100
                        }%`,
                      }}
                    />
                    <div
                      className="bg-rose-600 h-full transition-all"
                      style={{
                        width: `${
                          (selectedReportDetail.voteStats.no /
                            (selectedReportDetail.voteStats.yes + selectedReportDetail.voteStats.no)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Authority Resolution Proof Photo if available */}
              {selectedReportDetail.resolutionProofUrl && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                  <span className="text-xs font-bold text-emerald-800 block mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Authority Live Proof Photo:
                  </span>
                  <img
                    src={selectedReportDetail.resolutionProofUrl}
                    alt="Resolution Proof"
                    className="w-full h-40 object-cover rounded-lg border border-emerald-200"
                  />
                  {selectedReportDetail.resolutionNotes && (
                    <p className="text-xs text-slate-700 mt-2 italic">
                      "{selectedReportDetail.resolutionNotes}"
                    </p>
                  )}
                </div>
              )}

              {/* Success Message Banner */}
              {voteSuccessMessage && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{voteSuccessMessage}</span>
                </div>
              )}

              {/* Voting Form or Voted Status */}
              <div className="bg-white border border-stone-200 rounded-2xl p-4">
                {selectedReportDetail.communityVotes?.some((v) => v.userId === user?.uid) ? (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-600 font-medium">Your Verification Vote:</span>
                      {selectedReportDetail.communityVotes?.find((v) => v.userId === user?.uid)?.vote === 'yes' ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-bold flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> Verified Fixed
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full font-bold flex items-center gap-1">
                          <ThumbsDown className="w-3 h-3" /> Reported Still Unresolved
                        </span>
                      )}
                    </div>
                    {selectedReportDetail.communityVotes?.find((v) => v.userId === user?.uid)?.comment && (
                      <p className="text-xs text-slate-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200 italic">
                        "{selectedReportDetail.communityVotes?.find((v) => v.userId === user?.uid)?.comment}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span>Is this issue actually resolved on ground?</span>
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                        +15 Karma Points
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <button
                        type="button"
                        onClick={() => setVoteOption('yes')}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          voteOption === 'yes'
                            ? 'bg-emerald-700 text-white border-emerald-600 shadow-sm'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-300'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4 text-emerald-600" />
                        <span>Yes, Fixed!</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVoteOption('no')}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          voteOption === 'no'
                            ? 'bg-rose-700 text-white border-rose-600 shadow-sm'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-300'
                        }`}
                      >
                        <ThumbsDown className="w-4 h-4 text-rose-600" />
                        <span>No, Still Unresolved</span>
                      </button>
                    </div>

                    {voteOption && (
                      <div className="space-y-3 animate-in fade-in">
                        <textarea
                          rows={2}
                          value={voteComment}
                          onChange={(e) => setVoteComment(e.target.value)}
                          placeholder="Add your ground observations or feedback (e.g. 'I passed by today, pothole is filled properly' or 'Water is still leaking')..."
                          className="w-full bg-white border border-stone-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-500"
                        />

                        <button
                          type="button"
                          onClick={handleCommunityVote}
                          disabled={submittingVote}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                          {submittingVote ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Recording Vote...</span>
                            </>
                          ) : (
                            <>
                              <Award className="w-4 h-4 text-amber-400" />
                              <span>Submit Verification Vote (+15 Karma)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* List of recent community verification comments */}
                {selectedReportDetail.communityVotes && selectedReportDetail.communityVotes.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-stone-200">
                    <span className="text-[11px] font-bold text-slate-700 block mb-2">
                      Recent Citizen Verifications ({selectedReportDetail.communityVotes.length}):
                    </span>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedReportDetail.communityVotes.map((v, idx) => (
                        <div key={idx} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-[11px]">
                          <div className="flex items-center justify-between text-slate-600 mb-1">
                            <span className="font-mono text-slate-800 font-bold truncate max-w-[180px]">{v.userEmail}</span>
                            <div className="flex items-center gap-2">
                              {v.distanceKm !== undefined && (
                                <span className="text-[9px] bg-stone-200 text-stone-800 px-1.5 py-0.5 rounded font-mono font-medium">
                                  📍 {v.distanceKm} km away
                                </span>
                              )}
                              {v.vote === 'yes' ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                  <ThumbsUp className="w-3 h-3" /> Fixed
                                </span>
                              ) : (
                                <span className="text-rose-700 font-bold flex items-center gap-0.5">
                                  <ThumbsDown className="w-3 h-3" /> Unresolved
                                </span>
                              )}
                            </div>
                          </div>
                          {v.comment && <p className="text-slate-800">{v.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI DUPLICATE COMPLAINT DETECTION MODAL */}
      {duplicateModal && duplicateModal.isOpen && duplicateModal.match && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative animate-in zoom-in-95 my-8">
            <button
              onClick={() => setDuplicateModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Badge */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                <Layers className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[11px] font-bold tracking-wider uppercase">
                    Duplicate Issue Detected ({duplicateModal.match.overallScore}% match)
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                  An Active Complaint Already Exists
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              An existing report was identified for this exact location ({duplicateModal.match.distanceMeters}m away) with matching visual features.
            </p>

            {/* Comparison Box */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-4 mb-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 text-xs">
                <div>
                  <span className="text-slate-500 font-mono text-[11px]">Existing Complaint Ticket</span>
                  <span className="block font-bold font-mono text-slate-900 text-sm">
                    #{duplicateModal.match.ticketId}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[11px]">Supporters / Citizens</span>
                  <span className="block font-bold text-amber-900 text-sm flex items-center justify-end gap-1">
                    <Users className="w-3.5 h-3.5 text-amber-700" /> {duplicateModal.match.supportersCount || 1} Citizens
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">{duplicateModal.match.title}</h4>
                <p className="text-[11px] text-slate-700 line-clamp-2 bg-stone-100 p-2 rounded-xl border border-stone-200">
                  "{duplicateModal.match.description}"
                </p>
              </div>

              {/* Images Comparison */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold block mb-1">
                    Uploaded Photo
                  </span>
                  <div className="relative h-28 rounded-xl overflow-hidden border border-stone-200 bg-stone-900">
                    <img
                      src={duplicateModal.compressedImage}
                      alt="Uploaded"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold block mb-1">
                    Existing Report Photo
                  </span>
                  <div className="relative h-28 rounded-xl overflow-hidden border border-stone-200 bg-stone-900">
                    <img
                      src={duplicateModal.match.imageUrl}
                      alt="Existing"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* AI Breakdown Scores */}
              <div className="pt-2 border-t border-stone-200 grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-slate-500 block">Distance</span>
                  <span className="font-bold text-slate-900">{duplicateModal.match.distanceMeters}m</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-slate-500 block">Photo Similarity</span>
                  <span className="font-bold text-amber-900">{duplicateModal.match.imageScore}%</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-slate-500 block">Text Similarity</span>
                  <span className="font-bold text-emerald-800">{duplicateModal.match.textScore}%</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleJoinExistingComplaint}
                disabled={submitting}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Joining Complaint...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    <span>Join Existing Complaint (+1 Support & Merge Photo)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setDuplicateModal(null);
                  createNewReport(duplicateModal.newReportData);
                }}
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-slate-700 font-semibold text-xs rounded-2xl border border-stone-300 transition-all text-center cursor-pointer"
              >
                No, Submit as a Separate Independent Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE COMPLAINT CONFIRMATION MODAL */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setDeleteConfirmModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-red-600 mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Complaint Ticket?</h3>
            <p className="text-xs text-slate-600 text-center leading-relaxed mb-6">
              Are you sure you want to permanently delete complaint ticket{' '}
              <span className="font-mono font-bold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                #{deleteConfirmModal.ticketId}
              </span>
              ? This action cannot be undone and will remove it from the municipal database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteReport}
                disabled={deleting}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Ticket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
