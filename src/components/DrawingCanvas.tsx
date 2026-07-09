import React, { useRef, useState, useEffect } from "react";

interface DrawingCanvasProps {
  value?: string; // base64 dataUrl
  onChange: (dataUrl: string) => void;
}

export default function DrawingCanvas({ value, onChange }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#251817"); // Default Charcoal
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  // Colors list
  const colors = [
    { name: "Charcoal", hex: "#251817" },
    { name: "China Crimson", hex: "#8e171c" },
    { name: "Royal Blue", hex: "#1d4ed8" },
    { name: "Forest Green", hex: "#15803d" },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use standard high-DPI canvas scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(2, 2);
    context.lineCap = "round";
    context.lineJoin = "round";
    contextRef.current = context;

    // If an existing drawing exists, render it on the canvas
    if (value) {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.src = value;
      img.onload = () => {
        context.clearRect(0, 0, rect.width, rect.height);
        context.drawImage(img, 0, 0, rect.width, rect.height);
      };
    } else {
      // Clear with white background or keep transparent
      context.clearRect(0, 0, rect.width, rect.height);
    }
  }, []);

  // Handle ResizeObserver to maintain drawing on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;

        // Save current drawing content
        const currentData = canvas.toDataURL();

        canvas.width = width * 2;
        canvas.height = height * 2;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const context = canvas.getContext("2d");
        if (context) {
          context.scale(2, 2);
          context.lineCap = "round";
          context.lineJoin = "round";
          contextRef.current = context;

          // Re-draw saved content
          const img = new Image();
          img.referrerPolicy = "no-referrer";
          img.src = currentData;
          img.onload = () => {
            context.drawImage(img, 0, 0, width, height);
          };
        }
      }
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent scrolling when drawing on mobile touch screens
    if (e.cancelable) e.preventDefault();

    const { x, y } = getCoordinates(e);
    const context = contextRef.current;
    if (!context) return;

    context.beginPath();
    context.moveTo(x, y);
    context.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    context.lineWidth = tool === "eraser" ? brushSize * 3 : brushSize;
    
    // Draw a single dot on click/tap
    context.lineTo(x, y);
    context.stroke();

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();

    const { x, y } = getCoordinates(e);
    const context = contextRef.current;
    if (!context) return;

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const context = contextRef.current;
    if (context) {
      context.closePath();
    }
    setIsDrawing(false);

    // Save image state
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    onChange("");
  };

  return (
    <div className="flex flex-col space-y-3 bg-[#fffaf9] p-4 rounded-2xl border border-[#e0bfbc]/50 shadow-inner">
      {/* Tools bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0bfbc]/30 pb-3">
        {/* Color pickers */}
        <div className="flex items-center gap-2">
          {colors.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => {
                setColor(c.hex);
                setTool("pen");
              }}
              style={{ backgroundColor: c.hex }}
              className={`w-7 h-7 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                color === c.hex && tool === "pen"
                  ? "ring-2 ring-offset-2 ring-[#8e171c] scale-110"
                  : "border-[#e0bfbc]/60 hover:scale-105"
              }`}
              title={c.name}
            >
              {color === c.hex && tool === "pen" && (
                <span className="material-symbols-outlined text-white text-[14px]">check</span>
              )}
            </button>
          ))}

          {/* Eraser Button */}
          <button
            type="button"
            onClick={() => setTool("eraser")}
            className={`w-7 h-7 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
              tool === "eraser"
                ? "bg-[#8e171c] text-white ring-2 ring-offset-2 ring-[#8e171c]"
                : "bg-white text-[#59413f] border-[#e0bfbc] hover:bg-[#fff1f0]"
            }`}
            title="ยางลบ"
          >
            <span className="material-symbols-outlined text-[16px]">auto_eraser</span>
          </button>
        </div>

        {/* Brush Size Slider */}
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#59413f]">brush</span>
          <input
            type="range"
            min="2"
            max="16"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20 md:w-28 accent-[#8e171c]"
          />
          <span className="text-[10px] font-bold text-[#8c706e] w-4">{brushSize}px</span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={clearCanvas}
          className="px-3 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">delete</span>
          ล้างกระดานวาดเขียน
        </button>
      </div>

      {/* HTML5 Canvas Area */}
      <div className="relative w-full h-64 md:h-80 bg-white rounded-xl border border-[#e0bfbc]/40 shadow-inner overflow-hidden cursor-crosshair">
        <canvas
          id="drawingCanvas"
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute top-0 left-0 w-full h-full block touch-none"
        />
      </div>
    </div>
  );
}
