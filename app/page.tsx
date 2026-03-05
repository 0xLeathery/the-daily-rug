export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "clamp(2.5rem, 8vw, 5rem)",
          color: "#ffd700",
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          textAlign: "center",
        }}
      >
        THE DAILY RUG
      </h1>
      <p
        className="mt-4"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "clamp(0.9rem, 2.5vw, 1.25rem)",
          color: "#cc0000",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
        }}
      >
        STORIES LOADING...
      </p>
    </main>
  );
}
