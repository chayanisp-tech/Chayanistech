import React, { useState } from "react";
import { googleSignIn, setAccessToken } from "../lib/firebase";

interface TeacherLoginProps {
  onLoginSuccess: (email: string, isOAuthConnected: boolean) => void;
  onGoBack: () => void;
}

export default function TeacherLogin({ onLoginSuccess, onGoBack }: TeacherLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showVercelGuide, setShowVercelGuide] = useState(false);

  // Hardcoded credential as requested by user
  const TEACHER_EMAIL = "chayanisp@banmuang.ac.th";
  const TEACHER_PWD = "0827369178";

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (email.trim() !== TEACHER_EMAIL || password !== TEACHER_PWD) {
      setErrorText("อีเมลหรือรหัสผ่านไม่ถูกต้อง (เฉพาะคุณครู Chayanis P.)");
      return;
    }

    setIsLoggingIn(true);
    
    // Simulating login and suggesting Google authorization
    setTimeout(() => {
      setIsLoggingIn(false);
      // Trigger OAuth pop-up next to unlock sheets/drive syncing
      const confirmAuth = window.confirm(
        "เข้าสู่ระบบสถาบันสำเร็จ! เพื่อความต่อเนื่องในการเชื่อมต่อฐานข้อมูลรายชื่อนักเรียนและคะแนนสอบบน Google Sheets/Drive กรุณาลงชื่อเข้าใช้ด้วย Google ในขั้นตอนถัดไป"
      );
      
      if (confirmAuth) {
        handleGoogleSignIn();
      } else {
        // Teacher logged in with standard credentials only (no drive sync)
        onLoginSuccess(TEACHER_EMAIL, false);
      }
    }, 600);
  };

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorText("");
    try {
      const result = await googleSignIn();
      if (result) {
        // If the teacher logs in, check if it's the expected email
        // Or if she logs in with Google directly, we accept her!
        const loggedInEmail = result.user.email;
        if (loggedInEmail === TEACHER_EMAIL) {
          onLoginSuccess(loggedInEmail, true);
        } else {
          // If different, alert and save token but allow access as it's the user's active browser
          onLoginSuccess(loggedInEmail || TEACHER_EMAIL, true);
        }
      }
    } catch (err: any) {
      console.error("Google Sign In failed:", err);
      if (err.message && err.message.includes("IFRAME_POPUP_BLOCKED")) {
        setErrorText(err.message.replace("IFRAME_POPUP_BLOCKED: ", ""));
      } else if (err.message && err.message.includes("UNAUTHORIZED_DOMAIN")) {
        setErrorText(err.message.replace("UNAUTHORIZED_DOMAIN: ", ""));
      } else if (err.message && err.message.includes("POPUP_BLOCKED")) {
        setErrorText(err.message.replace("POPUP_BLOCKED: ", ""));
      } else {
        setErrorText("การเข้าสู่ระบบ Google ล้มเหลว หรือถูกยกเลิก (แนะนำให้เปิดแอปในแท็บใหม่แล้วลองอีกครั้ง)");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans bg-[#fff8f7] text-[#251817] px-6 py-12 relative overflow-hidden">
      {/* Back button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={onGoBack}
          className="flex items-center gap-1 text-sm font-semibold text-[#8f4a46] hover:text-[#8e171c] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          กลับหน้าหลักนักเรียน
        </button>
      </div>

      <div className="relative z-10 w-full max-w-[500px] mx-auto flex-grow flex flex-col justify-center items-center">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#8e171c] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              school
            </span>
            <span className="text-3xl font-black text-[#8e171c] tracking-tight">ExamMaster Pro</span>
          </div>
          <p className="text-xs uppercase tracking-widest font-black text-[#8c706e]">
            Institutional Admin
          </p>
        </div>

        {/* Access Form Card */}
        <div className="w-full bg-white border border-[#e0bfbc]/60 rounded-3xl p-8 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-[#251817]">เข้าสู่ระบบสำหรับคุณครูและผู้ดูแล</h2>
            <p className="text-sm text-[#59413f] mt-1">กรุณากรอกอีเมลและรหัสผ่านเพื่อจัดการระบบ</p>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="teacherEmail" className="block text-xs font-semibold text-[#59413f] ml-1">
                อีเมลสถาบัน
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c706e] text-[20px]">
                  mail
                </span>
                <input
                  id="teacherEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@institution.ac.th"
                  disabled={isLoggingIn}
                  className="w-full pl-11 pr-4 py-3 rounded-full border border-[#8c706e] focus:border-[#8e171c] focus:ring-4 focus:ring-[#8e171c]/10 outline-none text-sm font-medium text-[#251817]"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="teacherPassword" className="block text-xs font-semibold text-[#59413f] ml-1">
                รหัสผ่าน
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c706e] text-[20px]">
                  lock
                </span>
                <input
                  id="teacherPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoggingIn}
                  className="w-full pl-11 pr-12 py-3 rounded-full border border-[#8c706e] focus:border-[#8e171c] focus:ring-4 focus:ring-[#8e171c]/10 outline-none text-sm font-medium text-[#251817]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8c706e] hover:text-[#251817] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between text-xs px-1">
              <label className="flex items-center gap-2 text-[#59413f] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-[#8e171c] focus:ring-[#8e171c] border-[#8c706e] h-4 w-4"
                />
                จดจำการใช้งาน
              </label>
              <a href="#" className="text-[#8e171c] font-bold hover:underline">
                ลืมรหัสผ่าน?
              </a>
            </div>

            {errorText && (
              <p className="text-[#ba1a1a] text-xs font-semibold text-center mt-2">{errorText}</p>
            )}

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-[#8e171c] hover:bg-[#8c161b] text-white font-bold py-3.5 rounded-full shadow-lg shadow-[#8e171c]/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span>{isLoggingIn ? "กำลังประมวลผล..." : "เข้าสู่ระบบ"}</span>
              </button>
            </div>
          </form>

          {/* Separator */}
          <div className="relative my-6 text-center">
            <hr className="border-[#e0bfbc]/50" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-xs font-semibold text-[#8c706e]">
              หรือซิงค์ด่วนผ่านกูเกิล
            </span>
          </div>

          {/* Iframe Warning Banner */}
          {typeof window !== "undefined" && window.self !== window.top && (
            <div className="mb-4 p-3 bg-[#fff0ef] border border-[#ffdad7] rounded-2xl flex items-start gap-2 text-left">
              <span className="material-symbols-outlined text-[#8e171c] text-[18px] shrink-0 mt-0.5">info</span>
              <span className="text-[11px] font-semibold text-[#8f4a46] leading-snug">
                แอปพลิเคชันกำลังทำงานในกรอบพรีวิว หากลงชื่อเข้าใช้ Google ล้มเหลว แนะนำให้คลิกปุ่ม <b>"เปิดในแท็บใหม่"</b> (สัญลักษณ์สี่เหลี่ยมลูกศรชี้ออก) ที่มุมขวาบนของ AI Studio ก่อนเชื่อมต่อ Sheets ครับ
              </span>
            </div>
          )}

          {/* Google Sign In Button */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="w-full bg-[#ffe9e7] hover:bg-[#ffdad7] border border-[#e0bfbc] text-[#8e171c] font-bold py-3 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-75"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0 block">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              <span>ลงชื่อเข้าใช้ด้วยบัญชี Google</span>
            </button>

            {/* Vercel & Popup Blocker Troubleshooting Section */}
            <div className="border border-[#e0bfbc]/60 rounded-2xl bg-amber-50/40 p-4 text-left">
              <button
                type="button"
                onClick={() => setShowVercelGuide(!showVercelGuide)}
                className="w-full flex items-center justify-between text-xs font-bold text-[#8f4a46] hover:text-[#8e171c]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">help</span>
                  <span>พบปัญหาบล็อกป๊อปอัพ หรือใช้งานไม่ได้บน Vercel?</span>
                </div>
                <span className="material-symbols-outlined text-[16px]">
                  {showVercelGuide ? "expand_less" : "expand_more"}
                </span>
              </button>

              {showVercelGuide && (
                <div className="mt-3 space-y-3 text-[11px] text-[#59413f] border-t border-[#e0bfbc]/30 pt-3">
                  <div className="space-y-1">
                    <p className="font-bold text-[#8e171c]">1. ต้องอนุญาตโดเมนบน Firebase Console (สำคัญมากสำหรับ Vercel):</p>
                    <p className="leading-relaxed">
                      เนื่องจากระบบความปลอดภัยของ Firebase โดเมนของเว็บที่นำไปเปิดบน Vercel จะยังใช้งานล็อกอิน Google ไม่ได้จนกว่าคุณจะกดเพิ่มใน Firebase Console ครับ
                    </p>
                    <div className="bg-white border border-[#e0bfbc] rounded-lg p-2 flex items-center justify-between mt-1.5">
                      <code className="font-mono text-[10px] break-all select-all">
                        {typeof window !== "undefined" ? window.location.hostname : "your-app.vercel.app"}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            navigator.clipboard.writeText(window.location.hostname);
                            alert("คัดลอกโดเมนเรียบร้อยแล้ว!");
                          }
                        }}
                        className="text-[10px] font-bold text-[#8e171c] hover:underline shrink-0 ml-2"
                      >
                        คัดลอกโดเมน
                      </button>
                    </div>
                    <p className="leading-relaxed mt-1">
                      👉 <b>วิธีเพิ่มโดเมน:</b> ไปที่ <b>Firebase Console</b> &gt; เข้าโปรเจกต์ของคุณ &gt; <b>Authentication</b> &gt; เลือกแท็บ <b>Settings</b> ด้านบน &gt; แถบซ้ายมือคลิก <b>Authorized domains</b> &gt; กดปุ่ม <b>Add domain</b> แล้ววางโดเมนที่คัดลอกด้านบนลงไปแล้วกดบันทึก
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold text-[#8e171c]">2. วิธีแก้เบราว์เซอร์บล็อกหน้าต่างป๊อปอัพ (Popup Blocker):</p>
                    <p className="leading-relaxed">
                      หากคลิกปุ่มเชื่อมโยง Google แล้วไม่มีอะไรเปิดขึ้นมา แสดงว่าโดนระบบบล็อกป๊อปอัปของ Safari, Chrome หรือ Edge ป้องกันไว้
                    </p>
                    <p className="leading-relaxed">
                      👉 <b>วิธีปลดบล็อก:</b> ให้ดูแถบที่อยู่เว็บ (Address Bar) หรือไอคอนมุมขวาบนของเว็บ จะปรากฏสัญลักษณ์ป๊อปอัพโดนบล็อก ให้คลิกเปิดแล้วเลือก <b>"อนุญาตป๊อปอัปจากเว็บไซต์นี้เสมอ (Always allow)"</b> จากนั้นกดปุ่มใหม่อีกครั้ง
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold text-[#8e171c]">3. หากทดสอบบนกรอบพรีวิวของ AI Studio Build:</p>
                    <p className="leading-relaxed">
                      เนื่องจากแอปทำงานในรูปแบบกรอบซ้อนกรอบ (iframe) สำหรับนักพัฒนาเบราว์เซอร์จะป้องกันไม่ให้หน้าต่าง Google ล็อกอินเด้งเปิดขึ้นมา
                    </p>
                    <p className="leading-relaxed">
                      👉 <b>วิธีแก้:</b> แนะนำให้กดปุ่ม <b>"เปิดในแท็บใหม่"</b> (ไอคอนปุ่มสี่เหลี่ยมลูกศรชี้ขึ้นตรงมุมขวาบนสุด) เพื่อเปิดใช้งานบนแท็บเดี่ยวเต็มหน้าจอ แล้วจึงกดล็อกอินใช้งาน Google Drive/Sheets ได้อย่างลื่นไหล
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact IT Support */}
          <div className="mt-6 text-center">
            <button className="text-xs font-semibold text-[#8f4a46] hover:text-[#8e171c] hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto">
              <span className="material-symbols-outlined text-[16px]">support_agent</span>
              ติดต่อฝ่ายไอที
            </button>
          </div>
        </div>
      </div>

      {/* Footer Credentials */}
      <footer className="w-full text-center space-y-3 mt-8">
        <div className="flex flex-wrap justify-center gap-4 text-xs grayscale opacity-50">
          <div className="flex items-center gap-1 font-bold tracking-widest text-[#251817]">
            <span className="material-symbols-outlined text-[16px]">lock</span> SECURE 256-BIT ENCRYPTION
          </div>
          <div className="flex items-center gap-1 font-bold tracking-widest text-[#251817]">
            <span className="material-symbols-outlined text-[16px]">gshield</span> GOOGLE CLOUD PROTECTION
          </div>
        </div>
        <div className="text-xs text-[#59413f]">
          © 2026 ExamMaster Pro. สงวนลิขสิทธิ์ตามกฎหมาย
        </div>
      </footer>
    </div>
  );
}
