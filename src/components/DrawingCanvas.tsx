import React, { useRef, useEffect, useState } from "react";

interface DrawingCanvasProps {
  value: string;         // ก้อน Base64 แบบบีบอัด (ถ้ามี)
  onChange: (url: string) => void; 
  studentId: string;     // รับเพื่อรักษาโครงสร้าง props เดิมไว้
  questionId: string;    // รับเพื่อรักษาโครงสร้าง props เดิมไว้
}

export default function DrawingCanvas({ value, onChange, studentId, questionId }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // ใช้แทนสถานะกำลังบีบอัดภาพ

  // กำหนดขนาดและโครงสร้างของตารางคัดจีน
  const COLS = 5;       
  const ROWS = 1;       
  const BOX_SIZE = 100; 
  
  const canvasWidth = COLS * BOX_SIZE; 
  const canvasHeight = ROWS * BOX_SIZE; 

  // ฟังก์ชันวาดตารางกริดแบบ 田字格 หลายช่อง
  const drawChineseGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = "#e0bfbc"; 
    ctx.lineWidth = 1.5;

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

    ctx.strokeStyle = "#f0d5d2"; 
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]); 

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const startX = c * BOX_SIZE;
        const startY = r * BOX_SIZE;
        const centerX = startX + BOX_SIZE / 2;
        const centerY = startY + BOX_SIZE / 2;

        ctx.beginPath();
        ctx.moveTo(centerX, startY);
        ctx.lineTo(centerX, startY + BOX_SIZE);
        
        ctx.moveTo(startX, centerY);
        ctx.lineTo(startX + BOX_SIZE, centerY);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  };

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

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    setIsDrawing(true);
  };

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
  };

  // 🌟 ฟังก์ชันบันทึกเวอร์ชันแก้ไข: ถมพื้นหลังขาว ป้องกันรูปดำ และไม่ใช้ alert() ป้องกันระบบทุจริต
  const saveToCloud = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsUploading(true);
      
      const resizeCanvas = document.createElement("canvas");
      const ctx = resizeCanvas.getContext("2d");

      // บังคับหน้ากว้างของรูปให้เหลือ 400px (ความคมชัดกำลังสวยงามสำหรับเปิดบนจอครู)
      const targetWidth = 400;
      const targetHeight = (canvas.height / canvas.width) * targetWidth;

      resizeCanvas.width = targetWidth;
      resizeCanvas.height = targetHeight;

      if (ctx) {
        // 🔥 จุดสำคัญ 1: ถมพื้นหลังสีขาวลงไปก่อน เพื่อไม่ให้ภาพกลายเป็นสีดำเวลาแปลงเป็น JPEG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // 2. คัดลอกลายเส้นของเด็กจากแคนวาสจริง ลงแคนวาสจำลองที่ย่อส่วนแล้ว
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

        // 3. แปลงเป็นก้อน Base64 แบบ JPEG ความคมชัด 60% เพื่อลดขนาดไฟล์จาก MB เหลือเพียงไม่กี่ KB!
        const compressedBase64 = resizeCanvas.toDataURL("image/jpeg", 0.6);
        
        // 4. ส่งค่า Base64 มินิกลับไปบันทึก
        onChange(compressedBase64); 
        
        // 🔥 จุดสำคัญ 2: ไม่ใส่ alert(...) เพื่อป้องกันหน้าต่างเบราว์เซอร์หลุดโฟกัส (Anti-Cheat จะได้ไม่ทำงาน)
      }
    } catch (error) {
      console.error("Compression error:", error);
    } finally {
      setIsUploading(false);
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

      <div className="flex flex-wrap gap-2 justify-between items-center w-full px-2">
        <span className="text-[11px] font-bold text-[#8c706e]">
          💡 แนะนำ: คัดเสร็จแล้ว อย่าลืมกดปุ่ม "บันทึกคำตอบข้อนี้" ด้านขวา
        </span>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearCanvas}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#8f4a46] hover:text-[#8e171c] bg-[#ffd0cc]/40 hover:bg-[#ffd0cc]/70 rounded-full transition-all cursor-pointer"
          >
            ล้างสมุดคัด
          </button>

          {/* 🌟 ปุ่มบันทึกแบบเปลี่ยนสี: บันทึกสำเร็จจะเปลี่ยนเป็นสีเขียวทันที เด็กรับรู้ได้โดยไม่มี Alert รบกวนโฟกัสจอ */}
          <button
            type="button"
            onClick={saveToCloud}
            disabled={isUploading}
            className={`flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white rounded-full transition-all cursor-pointer ${
              isUploading 
                ? "bg-gray-400 cursor-not-allowed animate-pulse" 
                : value 
                  ? "bg-emerald-600 hover:bg-emerald-700" 
                  : "bg-[#8f4a46] hover:bg-[#8e171c]"
            }`}
          >
            {isUploading ? "กำลังบันทึก..." : value ? "✓ บันทึกสำเร็จแล้ว" : "💾 บันทึกคำตอบข้อนี้"}
          </button>
        </div>
      </div>
    </div>
  );
}
