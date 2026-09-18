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

  const autoSaveTimerRef =
    useRef<number | null>(null);

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
   * Auto save หลังหยุดวาด 700ms
   */
  const AUTO_SAVE_DELAY_MS =
    700;

  /**
   * จำกัดขนาด Base64
   */
  const MAX_BASE64_BYTES =
    120 * 1024;

  /**
   * ประมาณขนาดภาพจาก Base64
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
    ctx.strokeStyle =
      "#e0bfbc";

    ctx.lineWidth =
      1.5;

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
   * โหลดภาพคำตอบเดิมกลับเข้า Canvas
   *
   * ใช้ตอน:
   * - กลับมาข้อเดิม
   * - Refresh
   * - Resume exam
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
   * Cleanup timer ตอน component ถูกปิด
   */
  useEffect(() => {
    return () => {
      if (
        autoSaveTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          autoSaveTimerRef.current
        );
      }
    };
  }, []);

  /**
   * หาตำแหน่งปากกา/เมาส์
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

  /**
   * สร้างภาพ JPEG ขนาดเล็ก
   */
  const createCompressedImage = (
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

    const targetWidth =
      400;

    const targetHeight =
      Math.round(
        (
          sourceCanvas.height /
          sourceCanvas.width
        ) *
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
     * ถมพื้นหลังขาว
     * ป้องกัน JPEG กลายเป็นพื้นดำ
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
   * ========================================
   * SAVE DRAWING
   * ========================================
   *
   * ใช้ทั้ง Auto Save และปุ่ม Save เอง
   */
  const saveDrawing =
    async () => {
      const canvas =
        canvasRef.current;

      if (!canvas) return;

      /**
       * ถ้ากำลังบันทึกอยู่
       * ไม่ต้องยิงซ้ำ
       */
      if (isUploading) {
        return;
      }

      try {
        setIsUploading(true);

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
         * ถ้าเกิน 120KB
         * ลด quality ลงเรื่อย ๆ
         */
        while (
          bytes >
            MAX_BASE64_BYTES &&
          quality > 0.2
        ) {
          quality -=
            0.05;

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

        if (
          bytes >
          MAX_BASE64_BYTES
        ) {
          console.warn(
            "Drawing is still larger than recommended:",
            bytes
          );
        }

        /**
         * ส่งภาพกลับ StudentExamRoom
         *
         * จากนั้นระบบ Autosave ของข้อสอบ
         * จะเก็บ answers ลง localStorage ต่อเอง
         */
        onChange(
          compressedBase64
        );

        setHasUnsavedChanges(
          false
        );

        console.log(
          `Drawing autosaved: student=${studentId}, question=${questionId}, size=${Math.round(
            bytes / 1024
          )}KB`
        );
      } catch (error) {
        console.error(
          "Compression error:",
          error
        );

        /**
         * ถ้าบันทึกไม่สำเร็จ
         * ให้สถานะยังเป็น unsaved
         * เพื่อให้นักเรียนกด Save เองได้
         */
        setHasUnsavedChanges(
          true
        );
      } finally {
        setIsUploading(
          false
        );
      }
    };

  /**
   * ตั้งเวลาบันทึกอัตโนมัติ
   */
  const scheduleAutoSave =
    () => {
      if (
        autoSaveTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          autoSaveTimerRef.current
        );
      }

      autoSaveTimerRef.current =
        window.setTimeout(
          () => {
            autoSaveTimerRef.current =
              null;

            saveDrawing();
          },
          AUTO_SAVE_DELAY_MS
        );
    };

  /**
   * เริ่มวาด
   */
  const startDrawing = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    /**
     * ถ้ากำลังรอ Auto Save
     * แล้วเด็กกลับมาวาดต่อ
     * ให้ยกเลิก timer ก่อน
     */
    if (
      autoSaveTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        autoSaveTimerRef.current
      );

      autoSaveTimerRef.current =
        null;
    }

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

    ctx.lineWidth =
      3.5;

    ctx.lineCap =
      "round";

    ctx.lineJoin =
      "round";

    setIsDrawing(true);

    setHasUnsavedChanges(
      true
    );
  };

  /**
   * วาดต่อเนื่อง
   */
  const draw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) {
      return;
    }

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

  /**
   * ยกปากกา / ปล่อยเมาส์
   *
   * จุดนี้จะเรียก Auto Save
   */
  const stopDrawing =
    () => {
      if (!isDrawing) {
        return;
      }

      setIsDrawing(false);

      setHasUnsavedChanges(
        true
      );

      /**
       * รอ 700ms ก่อน Save
       *
       * ถ้าเด็กวาดต่อทันที
       * timer เดิมจะถูกยกเลิก
       */
      scheduleAutoSave();
    };

  /**
   * ล้างสมุดคัด
   */
  const clearCanvas =
    () => {
      /**
       * ยกเลิก Auto Save
       * ที่ยังค้างอยู่ก่อน
       */
      if (
        autoSaveTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          autoSaveTimerRef.current
        );

        autoSaveTimerRef.current =
          null;
      }

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

      /**
       * ลบคำตอบใน StudentExamRoom ด้วย
       */
      onChange("");

      setHasUnsavedChanges(
        false
      );
    };

  /**
   * ปุ่ม Save สำรอง
   */
  const handleManualSave =
    () => {
      if (
        autoSaveTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          autoSaveTimerRef.current
        );

        autoSaveTimerRef.current =
          null;
      }

      saveDrawing();
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
          {isUploading
            ? "⏳ กำลังบันทึกคำตอบอัตโนมัติ..."
            : hasUnsavedChanges
            ? "⏳ กำลังรอบันทึกอัตโนมัติ..."
            : value
            ? "✓ บันทึกคำตอบอัตโนมัติแล้ว"
            : "✍️ เขียนคำตอบได้เลย ระบบจะบันทึกให้อัตโนมัติ"}
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
              handleManualSave
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
              ? "กำลังบันทึก..."
              : hasUnsavedChanges
              ? "💾 บันทึกตอนนี้"
              : value
              ? "✓ บันทึกแล้ว"
              : "บันทึกอัตโนมัติ"}
          </button>
        </div>
      </div>
    </div>
  );
}
