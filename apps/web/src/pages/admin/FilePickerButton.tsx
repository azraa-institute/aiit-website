import { useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * A native <input type="file"> can't be restyled into a normal-looking
 * button -- its internal "Choose File" control + filename text are
 * browser-native and don't reliably center/align the way author CSS
 * expects (confirmed: they stayed pinned to the top of the box even with
 * `display:flex; align-items:center` on the input itself). Standard fix:
 * keep the real input in the DOM (visually-hidden, so it's still
 * focusable/accessible) and trigger it from a normal styled button.
 */
export function FilePickerButton({
  label,
  accept,
  multiple,
  disabled,
  onFiles,
  children,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: FileList) => void;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <button type="button" className="adm-btn adm-btn--ghost" disabled={disabled} onClick={() => ref.current?.click()}>
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        className="visually-hidden"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {children}
    </div>
  );
}
