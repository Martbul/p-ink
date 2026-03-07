"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@clerk/nextjs";
import {
  type Slideshow,
  type SlideshowSettings,
  type SlideshowSlide,
  getMySlideshow,
  upsertSlideshowSettings,
  setSlideshowActive,
  uploadSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
  advanceSlide,
  reactToSlide,
  deleteReaction,
} from "@/api/slideshow";


interface UploadState {
  file: File;
  progress: number; // 0–100
  error?: string;
}

interface SlideshowContextValue {
  // Data
  slideshow: Slideshow | null;
  loading: boolean;
  error: string | null;

  // Upload queue
  uploads: UploadState[];

  // Actions
  refresh: () => Promise<void>;
  saveSettings: (s: SlideshowSettings) => Promise<void>;
  toggleActive: (active: boolean) => Promise<void>;
  uploadPhoto: (file: File, caption?: string, durationMs?: number) => Promise<void>;
  uploadPhotos: (files: File[]) => Promise<void>;
  editSlide: (id: string, update: { caption?: string; duration_ms?: number }) => Promise<void>;
  removeSlide: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
  advance: () => Promise<number>;
  react: (slideId: string, emoji: string) => Promise<void>;
  unreact: (slideId: string) => Promise<void>;

  clearError: () => void;
}


const SlideshowContext = createContext<SlideshowContextValue | null>(null);

export function useSlideshowContext(): SlideshowContextValue {
  const ctx = useContext(SlideshowContext);
  if (!ctx) throw new Error("useSlideshowContext must be used inside <SlideshowProvider>");
  return ctx;
}


export function SlideshowProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [slideshow, setSlideshow] = useState<Slideshow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const token = useCallback(async () => {
    const t = await getToken();
    if (!t) throw new Error("Not authenticated");
    return t;
  }, [getToken]);

  const refresh = useCallback(async () => {
    try {
      const t = await token();
      const s = await getMySlideshow(t);
      if (mountedRef.current) setSlideshow(s);
    } catch (e: any) {
      if (mountedRef.current) setError(e.message);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    refresh().finally(() => {
      if (mountedRef.current) setLoading(false);
    });
  }, [refresh]);

  const saveSettings = useCallback(async (settings: SlideshowSettings) => {
    try {
      const t = await token();
      const updated = await upsertSlideshowSettings(t, settings);
      if (mountedRef.current) setSlideshow(updated);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, [token]);

  const toggleActive = useCallback(async (active: boolean) => {
    try {
      const t = await token();
      await setSlideshowActive(t, active);
      setSlideshow(prev => prev ? { ...prev, is_active: active } : prev);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, [token]);

  // Single upload with simulated progress
  const uploadPhoto = useCallback(async (file: File, caption?: string, durationMs?: number) => {
    const uploadEntry: UploadState = { file, progress: 0 };
    setUploads(prev => [...prev, uploadEntry]);

    // Fake progress tick while uploading (real XHR progress needs fetch replacement)
    const interval = setInterval(() => {
      setUploads(prev =>
        prev.map(u => u.file === file && u.progress < 80
          ? { ...u, progress: u.progress + 10 }
          : u
        )
      );
    }, 150);

    try {
      const t = await token();
      const slide = await uploadSlide(t, file, caption, durationMs);
      clearInterval(interval);

      // Mark done
      setUploads(prev => prev.map(u => u.file === file ? { ...u, progress: 100 } : u));
      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.file !== file));
      }, 800);

      // Append to local state
      setSlideshow(prev => {
        if (!prev) return prev;
        return { ...prev, slides: [...prev.slides, slide] };
      });
    } catch (e: any) {
      clearInterval(interval);
      setUploads(prev => prev.map(u => u.file === file ? { ...u, progress: 0, error: e.message } : u));
      throw e;
    }
  }, [token]);

  // Batch upload — sequential to avoid overwhelming the server
  const uploadPhotos = useCallback(async (files: File[]) => {
    for (const file of files) {
      await uploadPhoto(file);
    }
  }, [uploadPhoto]);

  const editSlide = useCallback(async (id: string, update: { caption?: string; duration_ms?: number }) => {
    try {
      const t = await token();
      const updated = await updateSlide(t, id, update);
      if (mountedRef.current) setSlideshow(updated);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, [token]);

  const removeSlide = useCallback(async (id: string) => {
    // Optimistic update
    setSlideshow(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides
          .filter(s => s.id !== id)
          .map((s, i) => ({ ...s, position: i })),
      };
    });
    try {
      const t = await token();
      await deleteSlide(t, id);
    } catch (e: any) {
      setError(e.message);
      refresh(); // rollback
      throw e;
    }
  }, [token, refresh]);

  const reorder = useCallback(async (orderedIds: string[]) => {
    // Optimistic: reorder locally first
    setSlideshow(prev => {
      if (!prev) return prev;
      const slideMap = new Map(prev.slides.map(s => [s.id, s]));
      const reordered = orderedIds
        .map((id, i) => slideMap.get(id)
          ? { ...slideMap.get(id)!, position: i }
          : null
        )
        .filter(Boolean) as SlideshowSlide[];
      return { ...prev, slides: reordered };
    });
    try {
      const t = await token();
      const updated = await reorderSlides(t, orderedIds);
      if (mountedRef.current) setSlideshow(updated);
    } catch (e: any) {
      setError(e.message);
      refresh();
      throw e;
    }
  }, [token, refresh]);

  const advance = useCallback(async (): Promise<number> => {
    const t = await token();
    const { current_index } = await advanceSlide(t);
    setSlideshow(prev => prev ? { ...prev, current_index } : prev);
    return current_index;
  }, [token]);

  const react = useCallback(async (slideId: string, emoji: string) => {
    try {
      const t = await token();
      await reactToSlide(t, slideId, emoji);
      setSlideshow(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          slides: prev.slides.map(s =>
            s.id === slideId
              ? { ...s, my_reaction: emoji, reaction_count: s.my_reaction ? s.reaction_count : s.reaction_count + 1 }
              : s
          ),
        };
      });
    } catch (e: any) {
      setError(e.message);
    }
  }, [token]);

  const unreact = useCallback(async (slideId: string) => {
    try {
      const t = await token();
      await deleteReaction(t, slideId);
      setSlideshow(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          slides: prev.slides.map(s =>
            s.id === slideId
              ? { ...s, my_reaction: "", reaction_count: Math.max(0, s.reaction_count - 1) }
              : s
          ),
        };
      });
    } catch (e: any) {
      setError(e.message);
    }
  }, [token]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <SlideshowContext.Provider value={{
      slideshow,
      loading,
      error,
      uploads,
      refresh,
      saveSettings,
      toggleActive,
      uploadPhoto,
      uploadPhotos,
      editSlide,
      removeSlide,
      reorder,
      advance,
      react,
      unreact,
      clearError,
    }}>
      {children}
    </SlideshowContext.Provider>
  );
}   