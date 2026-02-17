
import React, { useRef } from 'react';
import { Calendar, Clock as ClockIcon } from 'lucide-react';

interface InputProps {
  label: string;
  type?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, type = 'text', name, value, onChange, placeholder, required }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTriggerPicker = () => {
    if (inputRef.current) {
      if ('showPicker' in inputRef.current) {
        try {
          // Standard way to trigger native date/time/color/file pickers
          (inputRef.current as any).showPicker();
        } catch (e) {
          inputRef.current.focus();
        }
      } else {
        // Fallback for older browsers
        inputRef.current.focus();
        inputRef.current.click();
      }
    }
  };

  const isDateOrTime = type === 'date' || type === 'time';

  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="relative group">
        <input
          ref={inputRef}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onClick={isDateOrTime ? handleTriggerPicker : undefined}
          placeholder={placeholder}
          required={required}
          className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm bg-white text-slate-900 ${
            isDateOrTime ? 'pr-10 cursor-pointer' : ''
          }`}
          // type="time" uses native browser locale for AM/PM vs 24h display
        />
        {isDateOrTime && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTriggerPicker();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all z-10 pointer-events-none"
            tabIndex={-1}
          >
            {type === 'date' ? <Calendar className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
          </button>
        )}
      </div>
      <style>{`
        /* Native icons often conflict with custom ones. We hide them but keep their functionality. */
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
          z-index: 1;
        }
      `}</style>
    </div>
  );
};

export const Select: React.FC<InputProps & { options: string[] }> = ({ label, name, value, onChange, options, required }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm bg-white text-slate-900 cursor-pointer appearance-none pr-10"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt || 'Select Option'}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);

export const TextArea: React.FC<InputProps> = ({ label, name, value, onChange, placeholder, required }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      rows={3}
      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm bg-white text-slate-900 resize-none"
    />
  </div>
);
