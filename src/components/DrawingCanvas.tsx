import React, { useRef, useEffect, useState } from "react";

interface DrawingCanvasProps {
  value: string; // Data URL ของภาพ (ถ้ามี)
  onChange: (dataUrl: string) => void; // ฟังก์ชันส่งค่ากลับเมื่อมีการวาด
}

export default function DrawingCanvas({ value, onChange }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // กำหนดขนาดและโครงสร้างของตารางคัดจีน
  const COLS = 5;       // เปลี่ยนเป็น 5 ช่อง
  const ROWS = 1;       // เปลี่ยนเป็น 1 แถว
  const BOX_SIZE = 100; // เพิ่มขนาดช่องให้ใหญ่ขึ้น (จาก 80 เป็น 100 px หรือปรับได้ตามต้องการครับ)
  
  const canvasWidth = COLS * BOX_SIZE; // 480 px
  const canvasHeight = ROWS * BOX_SIZE; // 160 px

  // ฟังก์ชันวาดตารางกริดแบบ 田字格 หลายช่อง
  const drawChineseGrid = (ctx: CanvasRenderingContext2D) => {
    // 1. วาดกรอบนอกและเส้นแบ่งช่องทึบ (สีแดง/ชมพูอิงตามธีมระบบ)
    ctx.strokeStyle = "#e0bfbc"; 
    ctx.lineWidth = 1.5;

    // วาดเส้นขอบตารางและเส้นตัดระหว่างช่องใหญ่
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BOX_SIZE);
      ctx.lineTo(canvasWidth, r * BOX_SIZE);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BOX_SIZE, 0);
      ctx.lineTo(c * BOX_SIZE, canvasHeight);
      ctx.stroke();
    }

    // 2. วาดเส้นกากบาทประ "田" ด้านในของแต่ละช่อง
    ctx.strokeStyle = "#f0d5d2"; 
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]); // กำหนดรูปแบบเส้นประเล็กให้ดูสบายตา

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const startX = c * BOX_SIZE;
        const startY = r * BOX_SIZE;
        const centerX = startX + BOX_SIZE / 2;
        const centerY = startY + BOX_SIZE / 2;

        ctx.beginPath();
        // เส้นประตั้งตรงกลางช่อง
        ctx.moveTo(centerX, startY);
        ctx.lineTo(centerX, startY + BOX_SIZE);
        
        // เส้นประนอนตรงกลางช่อง
        ctx.moveTo(startX, centerY);
        ctx.lineTo(startX + BOX_SIZE, centerY);
        ctx.stroke();
      }
    }

    // รีเซ็ตเส้นประกลับเป็นเส้นทึบสำหรับการเขียนพู่กันปกติ
    ctx.setLineDash([]);
  };

  // จัดการวงจรชีวิตของ Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawChineseGrid(ctx);

    if (value) {
      const img = new Image();
      img.src = value;
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
    }
  }, [value]);

  // เริ่มเขียน
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

    // คำนวณพิกัดโดยเทียบกับอัตราส่วนจริงของ Canvas (แก้ปัญหาพิกัดเพี้ยนเวลาหดขยายจอ)
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // ตั้งค่าหัวพู่กัน (สีดำ, ขนาด 3.5px เพื่อให้พอดีกับช่องขนาด 80px)
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3.5;
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
      if (e.cancelable) e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

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
    drawChineseGrid(ctx);
    
    onChange("");
  };

  return (
    <div className="flex flex-col items-center gap-3 bg-[#fffaf9] p-4 rounded-3xl border border-[#e0bfbc]/50 w-full max-w-full overflow-hidden">
      {/* ห่อหุ้มด้วย div ที่ทำหน้าที่ scroll แนวนอนได้ เผื่อจอมือถือแคบเกินไป */}
      <div className="relative w-full overflow-x-auto pb-2 scrollbar-thin flex justify-start md:justify-center">
        <div className="rounded-2xl bg-white shadow-inner overflow-hidden border border-[#e0bfbc]/30" style={{ width: canvasWidth, height: canvasHeight }}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
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
      </div>

      <div className="flex justify-between items-center w-full px-2">
        <span className="text-[11px] font-bold text-[#8c706e]">
          💡 แนะนำ: คัดตัวอักษรเรียงจากซ้ายไปขวา
        </span>
        <button
          type="button"
          onClick={clearCanvas}
          className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-[#8f4a46] hover:text-[#8e171c] bg-[#ffd0cc]/40 hover:bg-[#ffd0cc]/70 rounded-full transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
          ล้างสมุดคัด
        </button>
      </div>
    </div>
  );
}
