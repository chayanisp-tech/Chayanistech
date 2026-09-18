import React, { useState } from "react";
import { Exam } from "../types";

interface PreExamChecklistProps {
  exam: Exam;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PreExamChecklist({
  exam,
  onConfirm,
  onCancel,
}: PreExamChecklistProps) {
  const [checks, setChecks] = useState({
    circleSearch: false,
    splitScreen: false,
    translator: false,
    notifications: false,
    ready: false,
  });

  const allChecked =
    checks.circleSearch &&
    checks.splitScreen &&
    checks.translator &&
    checks.notifications &&
    checks.ready;

  const toggleCheck = (
    key: keyof typeof checks
  ) => {
    setChecks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-[#8e171c] text-white p-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl">
              verified_user
            </span>

            <div>
              <h2 className="text-xl font-bold">
                เตรียมเครื่องก่อนเริ่มสอบ
              </h2>

              <p className="text-sm text-white/80 mt-1">
                {exam.title}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-amber-900">
              ⚠️ เมื่อกดเริ่มสอบ ระบบจะเริ่มจับเวลาทันที
            </p>

            <p className="text-xs text-amber-800 mt-1">
              กรุณาตรวจสอบอุปกรณ์ให้เรียบร้อยก่อนเริ่มทำข้อสอบ
            </p>
          </div>

          <div className="space-y-3">
            <CheckItem
              checked={checks.circleSearch}
              onClick={() =>
                toggleCheck("circleSearch")
              }
              title="ปิด Circle to Search / การค้นหาจากหน้าจอ"
              description="หลีกเลี่ยงการเรียกค้นหาจากข้อความหรือภาพในข้อสอบ"
            />

            <CheckItem
              checked={checks.splitScreen}
              onClick={() =>
                toggleCheck("splitScreen")
              }
              title="ปิดโหมดแบ่งหน้าจอ"
              description="ใช้หน้าจอข้อสอบเพียงหน้าต่างเดียวระหว่างสอบ"
            />

            <CheckItem
              checked={checks.translator}
              onClick={() =>
                toggleCheck("translator")
              }
              title="ปิดแอปแปลภาษาและเครื่องมือช่วยค้นหา"
              description="ไม่เปิด Google Translate หรือเครื่องมือช่วยตอบระหว่างสอบ"
            />

            <CheckItem
              checked={checks.notifications}
              onClick={() =>
                toggleCheck("notifications")
              }
              title="ปิดการแจ้งเตือนที่ไม่จำเป็น"
              description="แนะนำให้เปิดโหมดห้ามรบกวน เพื่อลดการเด้งออกจากหน้าสอบ"
            />

            <CheckItem
              checked={checks.ready}
              onClick={() =>
                toggleCheck("ready")
              }
              title="ฉันพร้อมเริ่มทำข้อสอบ"
              description={`ข้อสอบมี ${exam.questions.length} ข้อ ใช้เวลา ${exam.timeLimitMinutes} นาที`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-5 py-3 rounded-full border border-[#e0bfbc] text-[#59413f] font-bold text-sm hover:bg-[#fff8f7]"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              disabled={!allChecked}
              onClick={onConfirm}
              className={`flex-[2] px-5 py-3 rounded-full font-bold text-sm transition-all ${
                allChecked
                  ? "bg-[#8e171c] hover:bg-[#741318] text-white cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {allChecked
                ? "เริ่มทำข้อสอบ"
                : "กรุณายืนยันให้ครบ"}
            </button>
          </div>

          <p className="text-[11px] text-gray-500 text-center leading-relaxed">
            หมายเหตุ: เว็บไซต์ไม่สามารถตรวจหรือปิดฟังก์ชันระดับระบบของอุปกรณ์บางชนิดได้ทั้งหมด
            จึงควรปิดฟังก์ชันช่วยค้นหาและแปลภาษาก่อนเริ่มสอบ
          </p>
        </div>
      </div>
    </div>
  );
}

interface CheckItemProps {
  checked: boolean;
  onClick: () => void;
  title: string;
  description: string;
}

function CheckItem({
  checked,
  onClick,
  title,
  description,
}: CheckItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-all ${
        checked
          ? "border-emerald-300 bg-emerald-50"
          : "border-[#e0bfbc]/60 bg-white hover:bg-[#fff8f7]"
      }`}
    >
      <span
        className={`material-symbols-outlined mt-0.5 ${
          checked
            ? "text-emerald-600"
            : "text-gray-400"
        }`}
      >
        {checked
          ? "check_circle"
          : "radio_button_unchecked"}
      </span>

      <div>
        <p className="text-sm font-bold text-[#251817]">
          {title}
        </p>

        <p className="text-xs text-[#59413f] mt-1">
          {description}
        </p>
      </div>
    </button>
  );
}
