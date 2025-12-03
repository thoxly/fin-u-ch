// features/integrations/OzonIcon.tsx
interface OzonIconProps {
  size?: number;
  className?: string;
}

export const OzonIcon = ({ size = 24, className = '' }: OzonIconProps) => (
  <img
    src="https://img.icons8.com/?size=100&id=mTYp2rELH4P2&format=png&color=000000"
    alt="Ozon"
    width={size}
    height={size}
    className={`rounded ${className}`}
  />
);
