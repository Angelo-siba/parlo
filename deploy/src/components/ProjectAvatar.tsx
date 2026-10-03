const PROJECT_AVATAR_COLORS = [
  { background: "#A6E4E1", foreground: "#173D3B" },
  { background: "#B6E59B", foreground: "#294626" },
  { background: "#F3A15A", foreground: "#4A2A13" },
  { background: "#C7E9EB", foreground: "#244348" },
  { background: "#C6E89A", foreground: "#33441D" },
  { background: "#9DD1F1", foreground: "#1D3E53" },
  { background: "#E7A4C7", foreground: "#512B41" },
  { background: "#B6B8E5", foreground: "#302F54" },
  { background: "#F4D364", foreground: "#4A3B10" },
] as const;

type ProjectAvatarProps = {
  projectId: string;
  name: string;
  size?: "sm" | "md" | "lg";
};

export function ProjectAvatar({ projectId, name, size = "md" }: ProjectAvatarProps) {
  let hash = 0;
  for (let index = 0; index < projectId.length; index += 1) {
    hash = (hash * 31 + projectId.charCodeAt(index)) | 0;
  }
  const color = PROJECT_AVATAR_COLORS[(hash >>> 0) % PROJECT_AVATAR_COLORS.length];
  const initial = name.trim().charAt(0).toUpperCase() || "P";
  const dimensions = size === "sm" ? "h-7 w-7 rounded-md text-xs" : "h-9 w-9 rounded-lg text-sm";

  return (
    <span
      aria-hidden="true"
      title={name}
      className={`inline-flex shrink-0 items-center justify-center font-semibold ${dimensions}`}
      style={{ backgroundColor: color.background, color: color.foreground }}
    >
      {initial}
    </span>
  );
}
