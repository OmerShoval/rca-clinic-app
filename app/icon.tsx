import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#070f15",
        borderRadius: "96px",
      }}
    >
      {/* Wave arc */}
      <svg width="300" height="300" viewBox="0 0 300 300" fill="none">
        <path
          d="M40 180 Q 90 120, 150 160 Q 210 200, 260 140"
          stroke="#2fd6c0"
          strokeWidth="22"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M40 220 Q 90 160, 150 200 Q 210 240, 260 180"
          stroke="#e0b64f"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
      </svg>
    </div>,
    { ...size }
  );
}
