import React, { useMemo } from 'react';

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
  const [year, month, day] = value ? value.split('-').map(Number) : [0, 0, 0];

  const currentYear = new Date().getFullYear();
  // تبدأ من قبل 18 سنة (الأقرب لعمر 18) وتنزل للماضي، عشان أكثر الأعمار الشائعة تطلع أول بالقائمة
  const years = useMemo(() => {
    const startYear = currentYear - 18;
    return Array.from({ length: 83 }, (_, i) => startYear - i);
  }, [currentYear]);

  const daysInSelectedMonth = getDaysInMonth(month, year || currentYear - 18);
  const days = useMemo(() => Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1), [daysInSelectedMonth]);

  const emitChange = (newDay: number, newMonth: number, newYear: number) => {
    if (newDay && newMonth && newYear) {
      const paddedMonth = String(newMonth).padStart(2, '0');
      const paddedDay = String(Math.min(newDay, getDaysInMonth(newMonth, newYear))).padStart(2, '0');
      onChange(`${newYear}-${paddedMonth}-${paddedDay}`);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        value={day || ''}
        onChange={(e) => emitChange(Number(e.target.value), month, year)}
        className="px-2 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-sm focus:border-amber-500 outline-none"
      >
        <option value="" disabled>اليوم</option>
        {days.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      <select
        value={month || ''}
        onChange={(e) => emitChange(day, Number(e.target.value), year)}
        className="px-2 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-sm focus:border-amber-500 outline-none"
      >
        <option value="" disabled>الشهر</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>

      <select
        value={year || ''}
        onChange={(e) => emitChange(day, month, Number(e.target.value))}
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
