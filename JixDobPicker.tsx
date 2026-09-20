import React, { useEffect, useMemo, useState } from 'react';

interface JixDobPickerProps {
  value: string; // بصيغة YYYY-MM-DD أو فاضي
  onChange: (isoDate: string) => void;
}

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const getDaysInMonth = (month: number, year: number): number => {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
};

export const JixDobPicker: React.FC<JixDobPickerProps> = ({ value, onChange }) => {
  const currentYear = new Date().getFullYear();

  // ذاكرة داخلية لكل اختيار لحاله - تحتفظ بالقيمة حتى لو الحقول الثانية لسا فاضية
  const initial = value ? value.split('-').map(Number) : [0, 0, 0];
  const [year, setYear] = useState<number>(initial[0] || 0);
  const [month, setMonth] = useState<number>(initial[1] || 0);
  const [day, setDay] = useState<number>(initial[2] || 0);

  // لو الأب صفّر القيمة من الخارج (مثلاً إعادة تعيين الفورم)، نصفّر معه
  useEffect(() => {
    if (!value) {
      setYear(0);
      setMonth(0);
      setDay(0);
    }
  }, [value]);

  const years = useMemo(() => {
    const startYear = currentYear - 18;
    return Array.from({ length: 83 }, (_, i) => startYear - i);
  }, [currentYear]);

  const daysInSelectedMonth = getDaysInMonth(month, year || currentYear - 18);
  const days = useMemo(() => Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1), [daysInSelectedMonth]);

  // نرسل التاريخ الكامل للأب فقط لما تكتمل الثلاثة حقول
  useEffect(() => {
    if (day && month && year) {
      const safeDay = Math.min(day, getDaysInMonth(month, year));
      const paddedMonth = String(month).padStart(2, '0');
      const paddedDay = String(safeDay).padStart(2, '0');
      onChange(`${year}-${paddedMonth}-${paddedDay}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, month, year]);

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        value={day || ''}
        onChange={(e) => setDay(Number(e.target.value))}
        className="px-2 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-sm focus:border-amber-500 outline-none"
      >
        <option value="" disabled>اليوم</option>
        {days.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      <select
        value={month || ''}
        onChange={(e) => setMonth(Number(e.target.value))}
        className="px-2 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-sm focus:border-amber-500 outline-none"
      >
        <option value="" disabled>الشهر</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>

      <select
        value={year || ''}
        onChange={(e) => setYear(Number(e.target.value))}
        className="px-2 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-sm focus:border-amber-500 outline-none"
      >
        <option value="" disabled>السنة</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
};
