import { ImageResponse } from "next/og";

/* Link preview shown when the site is shared in chats and on social networks. */
export const alt = "Fathom, die Bar am Grund des Atlantiks";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#05090b",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "flex-end",
            justifyContent: "center",
            background: "linear-gradient(180deg, #04090f 0%, #2b1a22 55%, #ff6a3d 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 210,
              fontWeight: 700,
              letterSpacing: 6,
              color: "#e8efec",
              lineHeight: 0.72,
            }}
          >
            FATHOM
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(180deg, #0d5f66 0%, #06202a 60%, #05090b 100%)",
            color: "#e8efec",
            fontSize: 38,
          }}
        >
          Die Bar am Grund des Atlantiks
        </div>
      </div>
    ),
    size,
  );
}
