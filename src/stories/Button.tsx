import './button.css';

export interface ButtonProps {
  /** Is this the principal call to action on the page? */
  primary?: boolean;
  /** How large should the button be? */
  size?: 'small' | 'medium' | 'large';
  /** Button contents */
  label: string;
  /** Optional click handler */
  onClick?: () => void;
}

/** Primary UI component for user interaction */
export const Button: React.FC<ButtonProps> = ({ label, ...props }: ButtonProps) => {
  return (
    <button
      type="button"
      className="bg-slate-500 px-5 py-2 text-white text-xl shadow rounded-md hover:bg-slate-600 active:bg-slate-700 cursor-pointer"
      {...props}
    >
      {label}
    </button>
  );
};
