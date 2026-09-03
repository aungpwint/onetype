import type { ReactNode } from "react";
import type { KeyboardLayout, KeyDefinition } from "../../core/keyboard-layout/layout";
import { useTypingStore } from "../../stores/typing-store";
import { resolveTarget, resolveLastKey } from "../../core/target-model";
import { WIDE_KEY_LABEL } from "../../utils/fingerMapper";

/**
 * Self-contained Virtual Keyboard, rebuilt for a clean, responsive look.
 *
 * Every row is given the same total flex weight (each layout row sums to 15),
 * so all rows render at exactly the same width and the hand-guide fingertips
 * stay glued to the real keys at any screen size. The board is capped at a
 * comfortable max width, and keys keep a generous gutter so they never feel
 * cramped on a laptop or stretch absurdly wide on a large monitor.
 */
export function VirtualKeyboard({ layout }: { layout: KeyboardLayout }) {
  const tick = useTypingStore((s) => s.tick);
  void tick;
  const status = useTypingStore((s) => s.status);
  const engine = useTypingStore.getState().engine;
  const target = resolveTarget(engine, layout);
  const lastKey = resolveLastKey(engine);
  const expectedCode = target.keyCode;

  return (
    <div className="mx-auto w-full max-w-6xl select-none rounded-2xl bg-paper p-4 shadow-lg ring-1 ring-line sm:p-5">
      <div className="flex flex-col gap-2.5">
        {layout.rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2.5">
            {row.map((key) => {
              const isActive =
                key.code === expectedCode &&
                (status === "ready" || status === "running");
              const flashed =
                key.code === lastKey.keyCode
                  ? lastKey.correct ? "correct" : "incorrect"
                  : null;
              return (
                <Keycap
                  key={`${key.code}:${rowIndex}`}
                  definition={key}
                  isActive={isActive}
                  flashed={flashed}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-center font-mono text-[11px] tracking-wide text-ink-faint">
        {status === "ready"
          ? "Press the highlighted key to begin"
          : status === "paused"
            ? "Paused \u2014 press Esc to resume"
            : ""}
      </p>
    </div>
  );
}

// ─── Keycap ──────────────────────────────────────────────────────────────────

function Keycap({
  definition,
  isActive,
  flashed,
}: {
  definition: KeyDefinition;
  isActive: boolean;
  flashed: "correct" | "incorrect" | null;
}) {
  const width = definition.width ?? 1;
  const isModifier = definition.kind === "modifier" || definition.plain === undefined;
  const isSpace = definition.code === "Space";
  const wideLabel = WIDE_KEY_LABEL[definition.code];

  let label: ReactNode;
  if (isSpace) {
    label = null;
  } else if (isModifier || wideLabel !== undefined) {
    label = (
      <span className="text-[12px] font-semibold tracking-wide text-ink-soft">
        {wideLabel ?? definition.label}
      </span>
    );
  } else {
    // Reference style: one prominent primary glyph + a small latin hint below.
    const primary = definition.plain ?? definition.label;
    label = (
      <span className="flex flex-col items-center justify-center">
        <span className="font-myanmar text-lg leading-none text-ink">{primary}</span>
        <span className="mt-1.5 text-[10px] leading-none text-ink-faint">
          {definition.code.replace(/^Key/, "").replace(/^Digit/, "")}
        </span>
      </span>
    );
  }

  const flashBg =
    flashed === "correct"
      ? "from-success to-success"
      : flashed === "incorrect"
        ? "from-alert to-alert"
        : "";

  const face = isActive
    ? "z-20 scale-105 bg-brass text-paper font-extrabold shadow-[0_0_20px_color-mix(in_srgb,var(--brass)_50%,transparent)] ring-2 ring-brass"
    : flashed
      ? `bg-linear-to-b ${flashBg} text-paper`
      : "bg-linear-to-b from-key-top to-key-base shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ink)_5%,transparent),0_2px_0_color-mix(in_srgb,var(--ink)_20%,transparent)] ring-1 ring-line";

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      data-key={definition.code}
      className={[
        "relative flex select-none items-center justify-center overflow-hidden rounded-lg transition-all duration-150 ease-out",
        face,
      ].join(" ")}
      style={{ flex: width, height: isSpace ? 52 : 48, minHeight: 44 }}
    >
      {label ?? (
        <span className="text-[13px] text-ink-faint">{definition.label}</span>
      )}
    </button>
  );
}
