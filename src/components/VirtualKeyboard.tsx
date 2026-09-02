import type { ReactNode } from "react";
import type { KeyboardLayout, KeyDefinition } from "../core/keyboard-layout/layout";
import type { FingerId } from "../types";
import { useTypingStore } from "../stores/typing-store";

const FINGER_COLORS: Record<FingerId, string> = {
  "left-pinky": "#9a6a2f",
  "left-ring": "#8a5f4c",
  "left-middle": "#5f7a64",
  "left-index": "#4f837e",
  "right-index": "#a35f72",
  "right-middle": "#7c5f8a",
  "right-ring": "#7a7a52",
  "right-pinky": "#3f8f8f",
  "left-thumb": "#6f7d5d",
  "right-thumb": "#6f7d5d",
};

function Keycap({
  definition,
  active,
  flashed,
}: {
  definition: KeyDefinition;
  active: boolean;
  flashed: "correct" | "incorrect" | null;
}) {
  const width = definition.width ?? 1;
  const isModifier = definition.kind === "modifier" || definition.plain === undefined;
  const bothGlyphs = definition.plain !== undefined && definition.shifted !== undefined && definition.plain !== definition.shifted;

  let fill = "linear-gradient(180deg, var(--key-top), var(--key-base))";
  if (flashed === "correct") fill = "linear-gradient(180deg, var(--success), var(--success))";
  else if (flashed === "incorrect") fill = "linear-gradient(180deg, var(--alert), var(--alert))";

  let label: ReactNode;
  if (isModifier) {
    label = <span className="px-1 text-[0.7rem] font-semibold text-ink-soft">{definition.label}</span>;
  } else if (bothGlyphs) {
    label = (
      <span className="flex w-full items-baseline justify-between px-1.5">
        <span className="text-[0.6rem] text-ink-faint" aria-hidden>
          {definition.shifted}
        </span>
        <span className="ms text-[0.95rem] leading-none">{definition.plain}</span>
      </span>
    );
  } else {
    label = (
      <span className={`ms px-1.5 text-[0.95rem] leading-none ${definition.plain === " " ? "opacity-0" : ""}`}>
        {definition.plain}
      </span>
    );
  }

  const foreground = flashed === "correct" || flashed === "incorrect" ? "#fff" : undefined;

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      data-key={definition.code}
      className={`relative flex items-center justify-center rounded-md border border-black/20 text-center shadow-[0_2px_0_rgba(0,0,0,0.22)] transition-transform ${
        active ? "border-brass-strong -translate-y-1 shadow-[0_4px_0_rgba(0,0,0,0.26)]" : ""
      }`}
      style={{
        flex: width,
        height: 44,
        background: fill,
        color: foreground,
      }}
    >
      {label}
      <span
        className="absolute bottom-0 left-1/2 h-[3px] w-4 -translate-x-1/2 rounded-full"
        style={{ background: FINGER_COLORS[definition.finger] }}
        aria-hidden
      />
    </button>
  );
}

export function VirtualKeyboard({ layout }: { layout: KeyboardLayout }) {
  const tick = useTypingStore((s) => s.tick);
  void tick;
  const status = useTypingStore((s) => s.status);
  const expected = useTypingStore.getState().expectedKey();

  const lastEvent = useTypingStore.getState().engine?.lastEvent ?? null;
  const expectedCode = expected ? expected.code : null;
  const lastKey = lastEvent && (lastEvent.type === "correct" || lastEvent.type === "incorrect") ? (lastEvent.keyCode ?? null) : null;
  const lastCorrect = lastEvent?.type === "correct";

  return (
    <div className="select-none" aria-hidden>
      {layout.rows.map((row, rowIndex) => (
        <div key={rowIndex} className="mb-1.5 flex gap-1.5">
          {row.map((key) => {
            const isSpace = key.code === "Space";
            if (!isSpace && key.plain === undefined) {
              return <Keycap key={key.code} definition={key} active={false} flashed={null} />;
            }
            const isExpected = key.code === expectedCode;
            const active = isExpected;
            const flashed = key.code === lastKey ? (lastCorrect ? "correct" : "incorrect") : null;
            void isSpace;
            return <Keycap key={`${key.code}:${rowIndex}`} definition={key} active={active} flashed={flashed} />;
          })}
        </div>
      ))}
      <p className="mt-2 text-center text-[0.7rem] text-ink-faint">
        {status === "ready" ? "Press the highlighted key to begin." : status === "paused" ? "Paused — press Esc to resume." : ""}
      </p>
    </div>
  );
}