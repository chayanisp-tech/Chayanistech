import React, { useRef, useEffect, useState } from "react";

interface DrawingCanvasProps {
  value: string; // Data URL ของภาพ (ถ้ามี)
  onChange: (dataUrl: string) => void; // ฟังก์ชันส่งค่ากลับเมื่อมีการวาด
}

export default function DrawingCanvas({ value, onChange }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // เปลี่ยนเป็นฟังก์ชันวาดเส้นกริดแบบ 田字格 (สี่ช่องเสมือนแปลงนา)
  const drawChineseGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // 1. วาดกรอบสี่เหลี่ยมด้านนอก (เส้นทึบ)
    ctx.strokeStyle = "#e0bfbc"; // สีโทนแดง-ชมพูอ่อนอิงตามธีมระบบ
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // 2. วาดเส้นแบ่งกากบาทด้านใน (เส้นประแนวตั้งและแนวนอน)
    ctx.strokeStyle = "#f0d5d2"; 
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]); // กำหนดรูปแบบเส้นประ

    ctx.beginPath();
    
    // เส้นตั้งแบ่งครึ่งซ้าย-ขวา
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    
    // เส้นนอนแบ่งครึ่งบน-ล่าง
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    
    ctx.stroke();

    // รีเซ็ตกลับเป็นเส้นทึบเพื่อไม่ให้พู่กันที่นักเรียนเขียนกลายเป็นเส้นประ
    ctx.setLineDash([]);
  };

  // ส่วนการจัดการ Canvas Lifecycle (โหลดลายเส้นเก่าถ้ามี)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawChineseGrid(ctx, canvas.width, canvas.height);

    if (value) {
      const img = new Image();
      img.src = value;
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
    }
  }, [value]);

  // ฟังก์ชันเริ่มต้นการลากเส้นเขียนตัวอักษร
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // ตั้งค่าหัวพู่กันสีดำ ลากเส้นสมูทลื่นไหล
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    setIsDrawing(true);
  };

  // ระหว่างลากเส้นเขียน
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      if (e.cancelable) e.preventDefault(); // กันจอมือถือเลื่อนหลุดขณะเขียน
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      onChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawChineseGrid(ctx, canvas.width, canvas.height);
    
    onChange("");
  };

  return (
    <div className="flex flex-col items-center gap-3 bg-[#fffaf9] p-4 rounded-3xl border border-[#e0bfbc]/50">
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair block touch-none"
        />
      </div>

      <div className="flex gap-2 w-full justify-end">
        <button
          type="button"
          onClick={clearCanvas}
          className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-[#8f4a46] hover:text-[#8e171c] bg-[#ffd0cc]/40 hover:bg-[#ffd0cc]/70 rounded-full transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
          ล้างกระดานคัด
        </button>
      </div>
    </div>
  );
}
