"use client";

export function Avatar({
  src,
  name,
  size = 56,
  accentColor,
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  accentColor?: string | null;
  className?: string;
}) {
  const letter = (name || "?")[0].toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.4, flexShrink: 0 };

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "Avatar"}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className={`rounded-2xl object-cover ring-2 ring-[var(--border-accent)] ${className}`}
        style={style}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }

  return (
    <div
      className={`rounded-2xl flex items-center justify-center text-white font-bold ${accentColor ? "" : "bg-brand-gradient"} ${className}`}
      style={{ ...style, ...(accentColor ? { background: accentColor } : {}) }}
    >
      {letter}
    </div>
  );
}
