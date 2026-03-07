"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Undo2,
  Trash2,
  Grid3X3,
  ArrowRightLeft,
  LayoutTemplate,
  X,
  ArrowLeft,
} from "lucide-react";
import {
  TEMPLATES_16,
  TEMPLATES_32,
  type AvatarTemplate,
} from "@/components/ui/pixel-art/avatarTemplates";

const C = {
  cyan: "#05d9e8",
  purple: "#b122e5",
  pink: "#ff2a6d",
  yellow: "#f5d300",
  bg: "#07070f",
  card: "#0d0d1a",
  border: "#1a1a2e",
};

const DEFAULT_PALETTE: string[] =[
  "#ff2a6d",
  "#05d9e8",
  "#b122e5",
  "#f5d300",
  "#ffffff",
  "#000000",
  "#ff8c00",
  "#00ff88",
  "#1a1a2e",
  "#2d2d4e",
  "#4a4a8a",
  "#7b7bff",
  "#ff6b9d",
  "#c44dff",
  "#00d4ff",
  "#ffdc5e",
];

type Tool = "pencil" | "eraser" | "fill" | "eyedropper";

interface PixelAvatar {
  id?: string;
  name: string;
  pixels: number[];
  palette: string[];
  width: number;
  height: number;
}

function floodFill(
  pixels: number[],
  w: number,
  h: number,
  idx: number,
  from: number,
  to: number,
): number[] {
  if (from === to) return pixels;
  const next = [...pixels];
  const stack = [idx];
  const visited = new Set<number>();
  while (stack.length) {
    const i = stack.pop()!;
    if (i < 0 || i >= w * h) continue;
    if (visited.has(i)) continue;
    if (next[i] !== from) continue;
    visited.add(i);
    next[i] = to;
    const x = i % w,
      y = Math.floor(i / w);
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  return next;
}

function renderPixels(
  canvas: HTMLCanvasElement,
  pixels: number[],
  palette: string[],
  w: number,
  h: number,
  scale: number,
  showGrid: boolean,
) {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const light = (x + y) % 2 === 0;
      ctx.fillStyle = light ? "#1a1a2e" : "#0d0d1a";
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    if (p === -1) continue;
    const x = i % w,
      y = Math.floor(i / w);
    ctx.fillStyle = palette[p] ?? "#ffffff";
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }

  if (showGrid && scale >= 6) {
    ctx.strokeStyle = "rgba(5,217,232,0.12)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x++) {
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, h * scale);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(w * scale, y * scale);
      ctx.stroke();
    }
  }
}

function AvatarPreview({
  pixels,
  palette,
  width,
  height,
  scale,
  glow,
}: {
  pixels: number[];
  palette: string[];
  width: number;
  height: number;
  scale: number;
  glow?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.width = width * scale;
    ref.current.height = height * scale;
    renderPixels(ref.current, pixels, palette, width, height, scale, false);
  },[pixels, palette, width, height, scale]);

  return (
    <canvas
      ref={ref}
      className={`rounded ${glow ? "shadow-[0_0_20px_#05d9e855,0_0_40px_#b122e533]" : ""}`}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

export default function PixelArtPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  
  const [size, setSize] = useState<16 | 32 | null>(null);
  const[pixels, setPixels] = useState<number[]>([]);
  const [palette, setPalette] = useState<string[]>([...DEFAULT_PALETTE]);
  const [activeColor, setActive] = useState(0);
  const [tool, setTool] = useState<Tool>("pencil");
  const [showGrid, setShowGrid] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const[avatarName, setName] = useState("My Avatar");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const undoStack = useRef<number[][]>([]);
  const painting = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const SCALE = size === 32 ? 14 : 28;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch("/api/pixel-avatar/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: PixelAvatar = await res.json();
          setSize(data.width as 16 | 32);
          setPixels(data.pixels);
          setPalette(data.palette);
          setName(data.name);
        }
      } catch {}
      setLoading(false);
    })();
  }, [getToken]);

  const initGrid = (s: 16 | 32) => {
    setSize(s);
    setPixels(new Array(s * s).fill(-1));
    undoStack.current =[];
  };

  useEffect(() => {
    if (!canvasRef.current || !size) return;
    canvasRef.current.width = size * SCALE;
    canvasRef.current.height = size * SCALE;
    renderPixels(
      canvasRef.current,
      pixels,
      palette,
      size,
      size,
      SCALE,
      showGrid,
    );
  },[pixels, palette, size, SCALE, showGrid]);

  const pixelAt = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !size) return -1;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / SCALE);
      const y = Math.floor((e.clientY - rect.top) / SCALE);
      if (x < 0 || x >= size || y < 0 || y >= size) return -1;
      return y * size + x;
    },
    [size, SCALE],
  );

  const applyTool = useCallback(
    (idx: number) => {
      if (idx < 0 || !size) return;
      setPixels((prev) => {
        let next: number[];
        if (tool === "pencil") {
          next = [...prev];
          next[idx] = activeColor;
        } else if (tool === "eraser") {
          next = [...prev];
          next[idx] = -1;
        } else if (tool === "fill") {
          next = floodFill(prev, size, size, idx, prev[idx], activeColor);
        } else {
          const c = prev[idx];
          if (c !== -1) setActive(c);
          return prev;
        }
        return next;
      });
    },[tool, activeColor, size],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      painting.current = true;
      undoStack.current.push([...pixels]);
      if (undoStack.current.length > 50) undoStack.current.shift();
      applyTool(pixelAt(e));
    },
    [applyTool, pixelAt, pixels],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!painting.current) return;
      applyTool(pixelAt(e));
    },[applyTool, pixelAt],
  );

  const onMouseUp = () => {
    painting.current = false;
  };

  const undo = () => {
    const prev = undoStack.current.pop();
    if (prev) setPixels(prev);
  };

  const clearCanvas = () => {
    if (!size) return;
    undoStack.current.push([...pixels]);
    setPixels(new Array(size * size).fill(-1));
  };

  const save = async () => {
    if (!size) return;
    setSaving(true);
    try {
      const token = await getToken();
      await fetch("/api/pixel-avatar", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: avatarName,
          pixels,
          palette,
          width: size,
          height: size,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const updatePaletteColor = (idx: number, hex: string) => {
    setPalette((p) => {
      const n = [...p];
      n[idx] = hex;
      return n;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070f] flex flex-col items-center justify-center p-6 font-mono">
        <div className="text-[#05d9e8] text-sm opacity-60">loading...</div>
      </div>
    );
  }

  if (!size) {
    return (
      <div className="min-h-screen bg-[#07070f] text-[#e0e0e0] flex flex-col items-center px-4 py-6 pb-12 font-mono">
        <TemplateGallery
          onSelect={(t) => {
            setSize(t.width);
            setPixels([...t.pixels]);
            const p = [...t.palette];
            while (p.length < 16) p.push("#000000");
            setPalette(p);
            setName(t.name);
            undoStack.current =[];
          }}
          onBlank={(s) => initGrid(s)}
          onBack={() => router.back()}
        />
      </div>
    );
  }

  const toolBtns: { id: Tool; icon: React.ReactNode; label: string }[] =[
    { id: "pencil", icon: <Pencil size={18} />, label: "Draw" },
    { id: "eraser", icon: <Eraser size={18} />, label: "Erase" },
    { id: "fill", icon: <PaintBucket size={18} />, label: "Fill" },
    { id: "eyedropper", icon: <Pipette size={18} />, label: "Pick" },
  ];

  return (
    <div className="min-h-screen bg-[#07070f] text-[#e0e0e0] flex flex-col items-center px-4 py-6 pb-12 font-mono">
      {showTemplates && (
        <div
          className="fixed inset-0 bg-[#07070f]/90 z-[100] flex items-center justify-center p-6"
          onClick={() => setShowTemplates(false)}
        >
          <div
            className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-2xl p-7 w-full max-w-[940px] max-h-[90vh] overflow-y-auto flex flex-col gap-4 shadow-[0_0_60px_#b122e533]"
            onClick={(e) => e.stopPropagation()}
          >
            <TemplateGallery
              filterSize={size}
              onSelect={(t) => {
                undoStack.current.push([...pixels]);
                setPixels([...t.pixels]);
                const newPalette = [...t.palette];
                while (newPalette.length < 16) newPalette.push("#000000");
                setPalette(newPalette);
                setShowTemplates(false);
              }}
              onBlank={() => {
                undoStack.current.push([...pixels]);
                setPixels(new Array(size * size).fill(-1));
                setShowTemplates(false);
              }}
            />
            <button
              onClick={() => setShowTemplates(false)}
              className="self-center bg-transparent border border-[#333] rounded-md text-[#555] cursor-pointer font-mono text-xs px-5 py-2 tracking-widest mt-2 hover:text-[#fff] hover:border-[#555] transition-colors flex items-center gap-1.5"
            >
              <X size={14} /> CLOSE
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1100px] flex justify-between items-end mb-7 border-b border-[#1a1a2e] pb-5 flex-wrap gap-3">
        <div>
          <div className="text-[28px] font-bold tracking-[3px] lowercase text-[#05d9e8]">
            Pixel Avatar
          </div>
          <div className="text-[11px] text-[#555] tracking-[1px] mt-1">
            shown on your partner&apos;s frame when you send content
          </div>
        </div>
        <div className="flex gap-2.5 items-center flex-wrap">
          <input
            value={avatarName}
            onChange={(e) => setName(e.target.value)}
            className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-md text-[#ccc] px-3 py-2 text-[13px] font-mono outline-none focus:border-[#05d9e8] transition-colors w-40"
            placeholder="avatar name"
          />
          <button
            onClick={() => setSize(null)}
            className="rounded-md font-bold text-[13px] px-5 py-2 cursor-pointer tracking-[1px] font-mono transition-all border border-[#1a1a2e] text-[#ccc] hover:bg-[#1a1a2e]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className={`rounded-md font-bold text-[13px] px-5 py-2 cursor-pointer tracking-[1px] font-mono transition-all ${
              saved
                ? "bg-[#05d9e8] text-black cursor-default"
                : "bg-[#05d9e8] text-black hover:opacity-90 disabled:opacity-50"
            }`}
          >
            {saving ? "saving..." : saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-5 w-full max-w-[1100px]">
        <div className="w-40 shrink-0 flex flex-col gap-1">
          <div className="text-[9px] tracking-[2px] text-[#444] mb-1.5 mt-2">
            TOOLS
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {toolBtns.map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.label}
                className={`flex flex-col items-center gap-1.5 rounded-md p-2 cursor-pointer font-mono transition-colors ${
                  tool === t.id
                    ? "border border-[#05d9e8] text-[#05d9e8] bg-[#05d9e811]"
                    : "border border-[#1a1a2e] text-[#888] bg-[#0d0d1a]"
                }`}
              >
                {t.icon}
                <span className="text-[9px] opacity-70 tracking-[1px] uppercase">
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          <div className="text-[9px] tracking-[2px] text-[#444] mb-1.5 mt-4">
            EDIT
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={undo}
              title="Undo"
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-md text-[#777] py-1.5 cursor-pointer text-[11px] font-mono tracking-[0.5px] hover:text-[#fff]"
            >
              <Undo2 size={12} /> Undo
            </button>
            <button
              onClick={clearCanvas}
              title="Clear"
              className="flex-1 flex items-center justify-center gap-1 bg-[#0d0d1a] border border-[#1a1a2e] rounded-md text-[#777] py-1.5 cursor-pointer text-[11px] font-mono tracking-[0.5px] hover:text-[#ff2a6d]"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>

          <div className="flex gap-1.5 mt-1">
            <button
              onClick={() => setShowGrid((v) => !v)}
              className={`flex-1 flex items-center justify-center gap-1 bg-[#0d0d1a] border border-[#1a1a2e] rounded-md py-1.5 cursor-pointer text-[11px] font-mono tracking-[0.5px] transition-colors ${
                showGrid ? "text-[#05d9e8]" : "text-[#555]"
              }`}
            >
              <Grid3X3 size={12} /> Grid
            </button>
            <button
              onClick={() => initGrid(size === 16 ? 32 : 16)}
              title="Switch size (clears canvas)"
              className="flex-1 flex items-center justify-center gap-1 bg-[#0d0d1a] border border-[#1a1a2e] rounded-md text-[#777] py-1.5 cursor-pointer text-[11px] font-mono tracking-[0.5px] hover:text-[#fff]"
            >
              <ArrowRightLeft size={12} /> {size === 16 ? "32×32" : "16×16"}
            </button>
          </div>

          <div className="flex gap-1.5 mt-1">
            <button
              onClick={() => setShowTemplates(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#0d0d1a] border border-[#b122e544] rounded-md text-[#b122e5] py-1.5 cursor-pointer text-[11px] font-mono tracking-[0.5px] hover:bg-[#b122e511]"
            >
              <LayoutTemplate size={12} /> Templates
            </button>
          </div>

          <div className="text-[9px] tracking-[2px] text-[#444] mb-1.5 mt-5">
            PALETTE
          </div>
          <div className="grid grid-cols-4 gap-1">
            {palette.map((hex, i) => (
              <button
                key={i}
                onClick={() => {
                  setActive(i);
                  setTool("pencil");
                }}
                className="w-full aspect-square rounded-[3px] border-none cursor-pointer block transition-[outline]"
                style={{
                  background: hex,
                  outline:
                    activeColor === i
                      ? `2px solid ${C.cyan}`
                      : "2px solid transparent",
                  outlineOffset: 2,
                }}
                title={`Select color ${i + 1}`}
              />
            ))}
          </div>

          <div className="mt-5 bg-[#0d0d1a] border border-[#1a1a2e] p-3 rounded-lg flex flex-col gap-2 shadow-lg">
            <div className="text-[9px] tracking-[2px] text-[#555] uppercase">
              Active Color
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative w-8 h-8 rounded border border-[#1a1a2e] overflow-hidden shadow-inner flex-shrink-0 hover:border-[#05d9e8] transition-colors">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ backgroundColor: palette[activeColor] || "#000000" }}
                />
                <input
                  type="color"
                  value={palette[activeColor] || "#000000"}
                  onChange={(e) =>
                    updatePaletteColor(activeColor, e.target.value)
                  }
                  className="absolute -inset-4 w-16 h-16 opacity-0 cursor-pointer"
                />
              </div>
              <input
                type="text"
                value={palette[activeColor] || ""}
                onChange={(e) =>
                  updatePaletteColor(activeColor, e.target.value)
                }
                className="flex-1 bg-[#07070f] border border-[#1a1a2e] rounded px-2 py-1.5 text-[11px] text-[#ccc] font-mono outline-none focus:border-[#05d9e8] transition-colors uppercase w-full"
                maxLength={7}
                placeholder="#000000"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex justify-center items-start min-w-[300px]">
          <canvas
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            className="cursor-crosshair rounded block border border-[#1a1a2e] shadow-[0_0_30px_#b122e522]"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        <div className="w-52 shrink-0 flex flex-col gap-1.5">
          <div className="text-[9px] tracking-[2px] text-[#444] mb-1.5 mt-2">
            PREVIEW
          </div>

          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3 flex flex-col gap-2 items-start">
            <div className="text-[9px] tracking-[1.5px] text-[#444] uppercase">
              8× scale
            </div>
            <AvatarPreview
              pixels={pixels}
              palette={palette}
              width={size}
              height={size}
              scale={8}
              glow
            />
          </div>

          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3 flex flex-col gap-2 items-start">
            <div className="text-[9px] tracking-[1.5px] text-[#444] uppercase">
              4× scale
            </div>
            <AvatarPreview
              pixels={pixels}
              palette={palette}
              width={size}
              height={size}
              scale={4}
            />
          </div>

          <div className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3 flex flex-col gap-2 items-start">
            <div className="text-[9px] tracking-[1.5px] text-[#444] uppercase">
              on frame (notification)
            </div>
            <div className="w-full">
              <div className="bg-black rounded-md border border-[#222] p-2 w-full">
                <div className="bg-[#0a0a0a] rounded p-2">
                  <div className="flex justify-between items-end gap-2">
                    <div className="flex-1">
                      <div className="text-[#05d9e8] text-[10px] font-mono mb-1">
                        new photo ✦
                      </div>
                      <div className="text-[#aaa] text-[9px] font-mono">
                        from your partner
                      </div>
                    </div>
                    <div
                      className="border border-[#05d9e844] rounded p-[3px] bg-[#05d9e808]"
                      style={{ imageRendering: "pixelated" }}
                    >
                      <AvatarPreview
                        pixels={pixels}
                        palette={palette}
                        width={size}
                        height={size}
                        scale={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateThumbnail({
  template,
  size = 64,
}: {
  template: AvatarTemplate;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = size / template.width;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    for (let y = 0; y < template.height; y++) {
      for (let x = 0; x < template.width; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#1a1a2e" : "#0d0d1a";
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    for (let i = 0; i < template.pixels.length; i++) {
      const v = template.pixels[i];
      if (v < 0 || v >= template.palette.length) continue;
      const x = i % template.width;
      const y = Math.floor(i / template.width);
      ctx.fillStyle = template.palette[v];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }, [template, scale, size]);

  return (
    <canvas
      ref={canvasRef}
      className="block"
      style={{
        imageRendering: "pixelated",
        width: size,
        height: size,
      }}
    />
  );
}

function TemplateGallery({
  onSelect,
  onBlank,
  filterSize,
  onBack,
}: {
  onSelect: (t: AvatarTemplate) => void;
  onBlank: (s: 16 | 32) => void;
  filterSize?: 16 | 32;
  onBack?: () => void;
}) {
  const[activeSize, setActiveSize] = useState<16 | 32>(filterSize ?? 16);
  const[activeCategory, setActiveCategory] = useState("All");

  const templates = activeSize === 16 ? TEMPLATES_16 : TEMPLATES_32;
  const categories = useMemo(() => {
    const cats = Array.from(new Set(templates.map((t) => t.category)));
    return["All", ...cats];
  }, [templates]);

  const filtered =
    activeCategory === "All"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  const thumbSize = activeSize === 16 ? 80 : 64;

  return (
    <div className="w-full max-w-[900px] flex flex-col gap-5 px-1">
      <div className="relative text-center flex flex-col items-center justify-center">
        {onBack && !filterSize && (
          <button
            onClick={onBack}
            className="absolute left-0 top-0 border border-[#1a1a2e] rounded-md px-3 py-1.5 text-[11px] text-[#ccc] hover:bg-[#1a1a2e] transition-colors font-mono flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
        <div>
          <div className="text-[28px] font-bold tracking-[3px] text-[#05d9e8] font-mono">
            choose a template
          </div>
          <div className="text-[12px] text-[#555] tracking-[1px] mt-1.5 font-mono">
            pick one to start from, or begin with a blank canvas
          </div>
        </div>
      </div>

      {!filterSize && (
        <div className="flex gap-2.5 justify-center">
          {([16, 32] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setActiveSize(s);
                setActiveCategory("All");
              }}
              className={`border rounded-lg px-7 py-2 cursor-pointer font-mono text-sm tracking-[1px] transition-colors ${
                activeSize === s
                  ? "border-[#05d9e8] text-[#05d9e8] bg-[#05d9e811]"
                  : "bg-[#0d0d1a] border-[#1a1a2e] text-[#666] hover:border-[#333]"
              }`}
            >
              {s}×{s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap justify-center">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`border rounded-full px-3.5 py-1 cursor-pointer font-mono text-[11px] tracking-[1px] transition-colors ${
              activeCategory === cat
                ? "border-[#b122e5] text-[#b122e5] bg-[#b122e511]"
                : "bg-[#0d0d1a] border-[#1a1a2e] text-[#555] hover:border-[#333]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3 max-h-[55vh] overflow-y-auto pr-1">
        <button
          onClick={() => onBlank(activeSize)}
          className="bg-[#0d0d1a] border border-dashed border-[#2a2a4e] rounded-lg p-3 pb-2.5 cursor-pointer flex flex-col items-center gap-1.5 transition-colors hover:border-[#4a4a8a] font-mono group"
        >
          <div
            className="grid grid-cols-4 gap-[2px] rounded overflow-hidden"
            style={{ width: thumbSize, height: thumbSize }}
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square"
                style={{ background: i % 2 === 0 ? "#1a1a2e" : "#0d0d1a" }}
              />
            ))}
          </div>
          <div className="text-[11px] text-[#ccc] tracking-[0.5px] text-center mt-1 group-hover:text-white transition-colors">
            blank
          </div>
          <div className="text-[9px] text-[#444] tracking-[1px] uppercase">
            {activeSize}×{activeSize}
          </div>
        </button>

        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg p-3 pb-2.5 cursor-pointer flex flex-col items-center gap-1 transition-all hover:border-[#3a3a5e] hover:shadow-[0_4px_12px_#00000044] font-mono group"
          >
            <TemplateThumbnail template={t} size={thumbSize} />
            <div className="text-[11px] text-[#ccc] tracking-[0.5px] text-center mt-1.5 group-hover:text-white transition-colors">
              {t.name}
            </div>
            <div className="text-[9px] text-[#444] tracking-[1px] uppercase">
              {t.category}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}