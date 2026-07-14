// 🌟 ฟังก์ชันบันทึกเวอร์ชันแก้ไข: ถมพื้นหลังขาว ป้องกันรูปดำ และไม่ใช้ alert() ป้องกันระบบทุจริต
  const saveToCloud = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsUploading(true);
      
      const resizeCanvas = document.createElement("canvas");
      const ctx = resizeCanvas.getContext("2d");

      const targetWidth = 400;
      const targetHeight = (canvas.height / canvas.width) * targetWidth;

      resizeCanvas.width = targetWidth;
      resizeCanvas.height = targetHeight;

      if (ctx) {
        // 🔥 จุดสำคัญ 1: ถมพื้นหลังสีขาวลงไปก่อน เพื่อไม่ให้ภาพกลายเป็นสีดำเวลาแปลงเป็น JPEG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // 2. วาดภาพลายเส้นพู่กันทับลงไปบนพื้นหลังสีขาว
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

        // 3. แปลงเป็น Base64 มินิ (JPEG คุณภาพ 60%) ขนาดจะเล็กมาก
        const compressedBase64 = resizeCanvas.toDataURL("image/jpeg", 0.6);
        
        // 4. ส่งค่ากลับไปบันทึก
        onChange(compressedBase64); 
        
        // 🔥 จุดสำคัญ 2: ห้ามใส่ alert(...) เด็ดขาด เพื่อไม่ให้ระบบเตือนทุจริตทำงาน
        // เราจะอาศัยการเปลี่ยนสถานะปุ่ม หรือปล่อยให้เด็กเห็นว่าบันทึกแล้วพอค่ะ
      }
    } catch (error) {
      console.error("Compression error:", error);
    } finally {
      setIsUploading(false);
    }
  };
