import React, {
  useRef,
  useEffect,
  useState,
} from "react";

interface DrawingCanvasProps {
  value: string;
  onChange: (url: string) => void;
  studentId: string;
  questionId: string;
}

export default function DrawingCanvas({
  value,
  onChange,
  studentId,
  questionId,
}: DrawingCanvasProps) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const [isDrawing, setIsDrawing] =
    useState(false);

  const [isUploading, setIsUploading] =
    useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] =
    useState(false);

  /**
   * ตารางคัดจีน
   */
  const COLS = 5;
  const ROWS = 1;
  const BOX_SIZE = 100;

  const canvasWidth =
    COLS * BOX_SIZE;

  const canvasHeight =
    ROWS * BOX_SIZE;

  /**
   * จำกัดขนาด Base64
   *
   * เป้าหมาย:
   * รูปหนึ่งไม่ควรเกิน ~120 KB
   *
   * Firestore มี document size limit
   * ดังนั้นยิ่งเล็กยิ่งปลอดภัย
   */
  const MAX_BASE64_BYTES =
    120 * 1024;

  /**
   * ประมาณขนาดจริงของ Base64
   */
  const estimateBase64Bytes = (
    dataUrl: string
  ) => {
    const base64 =
      dataUrl.split(",")[1] || "";

    return Math.ceil(
      (base64.length * 3) / 4
    );
  };

  /**
   * วาดตาราง 田字格
   */
  const drawChineseGrid = (
    ctx: CanvasRenderingContext2D
  ) => {
    ctx.strokeStyle = "#e0bfbc";
    ctx.lineWidth = 1.5;

    for (
      let r = 0;
      r <= ROWS;
      r++
    ) {
      ctx.beginPath();

      ctx.moveTo(
        0,
        r * BOX_SIZE
      );

      ctx.lineTo(
        canvasWidth,
        r * BOX_SIZE
      );

      ctx.stroke();
    }

    for (
      let c = 0;
      c <= COLS;
      c++
    ) {
      ctx.beginPath();

      ctx.moveTo(
        c * BOX_SIZE,
        0
      );

      ctx.lineTo(
        c * BOX_SIZE,
        canvasHeight
      );

      ctx.stroke();
    }

    ctx.strokeStyle =
      "#f0d5d2";

    ctx.lineWidth = 1;

    ctx.setLineDash([
      4,
      4,
    ]);

    for (
      let r = 0;
      r < ROWS;
      r++
    ) {
      for (
        let c = 0;
        c < COLS;
        c++
      ) {
        const startX =
          c * BOX_SIZE;

        const startY =
          r * BOX_SIZE;

        const centerX =
          startX +
          BOX_SIZE / 2;

        const centerY =
          startY +
          BOX_SIZE / 2;

        ctx.beginPath();

        ctx.moveTo(
          centerX,
          startY
        );

        ctx.lineTo(
          centerX,
          startY +
            BOX_SIZE
        );

        ctx.moveTo(
          startX,
          centerY
        );

        ctx.lineTo(
          startX +
            BOX_SIZE,
          centerY
        );

        ctx.stroke();
      }
    }

    ctx.setLineDash([]);
  };

  /**
   * โหลดค่าที่บันทึกไว้กลับมา
   */
  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext(
        "2d"
      );

    if (!ctx) return;

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    drawChineseGrid(ctx);

    if (!value) {
      setHasUnsavedChanges(
        false
      );

      return;
    }

    const img =
      new Image();

    img.onload = () => {
      ctx.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
      );

      setHasUnsavedChanges(
        false
      );
    };

    img.onerror = () => {
      console.error(
        "ไม่สามารถโหลดภาพคำตอบเดิมได้"
      );
    };

    img.src = value;
  }, [value]);

  /**
   * หาตำแหน่ง pointer
   */
  const getPointerPosition = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect =
      canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (
        e.touches.length ===
        0
      ) {
        return null;
      }

      clientX =
        e.touches[0]
          .clientX;

      clientY =
        e.touches[0]
          .clientY;
    } else {
      clientX =
        e.clientX;

      clientY =
        e.clientY;
    }

    const x =
      ((clientX -
        rect.left) /
        rect.width) *
      canvas.width;

    const y =
      ((clientY -
        rect.top) /
        rect.height) *
      canvas.height;

    return {
      x,
      y,
    };
  };

  const startDrawing = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext(
        "2d"
      );

    if (!ctx) return;

    const position =
      getPointerPosition(e);

    if (!position) return;

    if (
      "touches" in e &&
      e.cancelable
    ) {
      e.preventDefault();
    }

    ctx.beginPath();

    ctx.moveTo(
      position.x,
      position.y
    );

    ctx.strokeStyle =
      "#1a1a1a";

    ctx.lineWidth = 3.5;

    ctx.lineCap =
      "round";

    ctx.lineJoin =
      "round";

    setIsDrawing(true);

    setHasUnsavedChanges(
      true
    );
  };

  const draw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;

    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext(
        "2d"
      );

    if (!ctx) return;

    const position =
      getPointerPosition(e);

    if (!position) return;

    if (
      "touches" in e &&
      e.cancelable
    ) {
      e.preventDefault();
    }

    ctx.lineTo(
      position.x,
      position.y
    );

    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) {
      return;
    }

    setIsDrawing(false);

    setHasUnsavedChanges(
      true
    );
  };

  /**
   * สร้างภาพ JPEG ขนาดเล็ก
   */
  const createCompressedImage =
    (
      sourceCanvas: HTMLCanvasElement,
      quality: number
    ): string => {
      const resizeCanvas =
        document.createElement(
          "canvas"
        );

      const ctx =
        resizeCanvas.getContext(
          "2d"
        );

      /**
       * 400px เพียงพอสำหรับ
       * ตารางคัด 5 ช่อง
       */
      const targetWidth =
        400;

      const targetHeight =
        Math.round(
          (sourceCanvas.height /
            sourceCanvas.width) *
            targetWidth
        );

      resizeCanvas.width =
        targetWidth;

      resizeCanvas.height =
        targetHeight;

      if (!ctx) {
        throw new Error(
          "ไม่สามารถสร้าง Canvas สำหรับบีบอัดรูปได้"
        );
      }

      /**
       * JPEG ไม่มี transparency
       * จึงต้องถมพื้นขาวก่อน
       */
      ctx.fillStyle =
        "#ffffff";

      ctx.fillRect(
        0,
        0,
        targetWidth,
        targetHeight
      );

      ctx.drawImage(
        sourceCanvas,
        0,
        0,
        targetWidth,
        targetHeight
      );

      return resizeCanvas.toDataURL(
        "image/jpeg",
        quality
      );
    };

  /**
   * บันทึกคำตอบ
   *
   * ไม่มี Firebase Storage
   * จึงบีบ Base64 ให้เล็กที่สุด
   */
  const saveToCloud =
    async () => {
      const canvas =
        canvasRef.current;

      if (!canvas) return;

      try {
        setIsUploading(true);

        /**
         * เริ่ม quality 45%
         */
        let quality =
          0.45;

        let compressedBase64 =
          createCompressedImage(
            canvas,
            quality
          );

        let bytes =
          estimateBase64Bytes(
            compressedBase64
          );

        /**
         * ถ้ายังเกิน 120 KB
         * ลด quality ลงอีก
         */
        while (
          bytes >
            MAX_BASE64_BYTES &&
          quality > 0.2
        ) {
          quality -= 0.05;

          compressedBase64 =
            createCompressedImage(
              canvas,
              quality
            );

          bytes =
            estimateBase64Bytes(
              compressedBase64
            );
        }

        /**
         * Safety check
         */
        if (
          bytes >
          MAX_BASE64_BYTES
        ) {
          console.warn(
            "Drawing is still larger than recommended:",
            bytes
          );
        }

        onChange(
          compressedBase64
        );

        setHasUnsavedChanges(
          false
        );

        console.log(
          `Drawing saved: student=${studentId}, question=${questionId}, size=${Math.round(
            bytes / 1024
          )}KB`
        );
      } catch (error) {
        console.error(
          "Compression error:",
          error
        );
      } finally {
        setIsUploading(
          false
        );
      }
    };

  const clearCanvas = () => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext(
        "2d"
      );

    if (!ctx) return;

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    drawChineseGrid(ctx);

    onChange("");

    setHasUnsavedChanges(
      false
    );
  };

  return (
    <div className="flex flex-col items-center gap-3 bg-[#fffaf9] p-4 rounded-3xl border border-[#e0bfbc]/50 w-full max-w-full overflow-hidden">
      <div className="relative w-full overflow-x-auto pb-2 scrollbar-thin flex justify-start md:justify-center">
        <div
          className="rounded-2xl bg-white shadow-inner overflow-hidden border border-[#e0bfbc]/30"
          style={{
            width:
              canvasWidth,

            height:
              canvasHeight,
          }}
        >
          <canvas
            ref={canvasRef}
            width={
              canvasWidth
            }
            height={
              canvasHeight
            }
            onMouseDown={
              startDrawing
            }
            onMouseMove={
              draw
            }
            onMouseUp={
              stopDrawing
            }
            onMouseLeave={
              stopDrawing
            }
            onTouchStart={
              startDrawing
            }
            onTouchMove={
              draw
            }
            onTouchEnd={
              stopDrawing
            }
            className="cursor-crosshair block touch-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-between items-center w-full px-2">
        <span className="text-[11px] font-bold text-[#8c706e]">
          {hasUnsavedChanges
            ? '⚠️ มีการแก้ไขที่ยังไม่ได้บันทึก กรุณากด "บันทึกคำตอบข้อนี้"'
            : value
            ? "✓ คำตอบข้อนี้บันทึกแล้ว"
            : '💡 คัดเสร็จแล้ว กรุณากด "บันทึกคำตอบข้อนี้"'}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={
              clearCanvas
            }
            disabled={
              isUploading
            }
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#8f4a46] hover:text-[#8e171c] bg-[#ffd0cc]/40 hover:bg-[#ffd0cc]/70 rounded-full transition-all cursor-pointer disabled:opacity-50"
          >
            ล้างสมุดคัด
          </button>

          <button
            type="button"
            onClick={
              saveToCloud
            }
            disabled={
              isUploading ||
              !hasUnsavedChanges
            }
            className={`flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white rounded-full transition-all ${
              isUploading
                ? "bg-gray-400 cursor-not-allowed animate-pulse"
                : hasUnsavedChanges
                ? "bg-[#8f4a46] hover:bg-[#8e171c] cursor-pointer"
                : value
                ? "bg-emerald-600 cursor-default"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {isUploading
              ? "กำลังบีบอัด..."
              : hasUnsavedChanges
              ? "💾 บันทึกคำตอบข้อนี้"
              : value
              ? "✓ บันทึกสำเร็จแล้ว"
              : "ยังไม่มีคำตอบ"}
          </button>
        </div>
      </div>
    </div>
  );
}
