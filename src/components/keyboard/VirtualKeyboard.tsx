import type { ReactNode } from "react";
import type {
  KeyboardLayout,
  KeyDefinition,
} from "../../core/keyboard-layout/layout";
import { useTypingStore } from "../../stores/typing-store";
import { resolveLastKey, resolveTarget } from "../../core/target-model";
import type { Hand } from "../../types";
import { WIDE_KEY_LABEL } from "../../utils/fingerMapper";

interface VirtualKeyboardProps {
  layout: KeyboardLayout;
}

export function VirtualKeyboard({ layout }: VirtualKeyboardProps) {
  // Subscribe to the store so the keyboard re-renders when typing state changes.
  const tick = useTypingStore((state) => state.tick);
  void tick;

  const status = useTypingStore((state) => state.status);
  const engine = useTypingStore((state) => state.engine);

  const target = resolveTarget(engine, layout);
  const lastKey = resolveLastKey(engine);

  const expectedCode = target.keyCode;

  const expectedShiftCode = target.requiresShift
    ? shiftCodeFor(target.shiftHand)
    : null;

  const showHint = status === "ready" || status === "running";

  return (
    <section
      aria-label="Virtual keyboard"
      className="
        w-full
        select-none
        rounded-2xl
        border border-border/70
        bg-card/95
        p-3
        shadow-sm
        backdrop-blur-sm
        sm:p-4
        lg:p-5
        2xl:p-6
      "
    >
      <div
        className="
          mx-auto
          w-full
          min-w-0
        "
      >
        <div
          className="
            flex
            w-full
            flex-col
            gap-1.5
            sm:gap-2
            lg:gap-2.5
            2xl:gap-3
          "
        >
          {layout.rows.map((row, rowIndex) => (
            <KeyboardRow key={rowIndex}>
              {row.map((definition) => {
                const isActive =
                  showHint &&
                  (definition.code === expectedCode ||
                    definition.code === expectedShiftCode);

                const flashed =
                  definition.code === lastKey.keyCode
                    ? lastKey.correct
                      ? "correct"
                      : "incorrect"
                    : null;

                const isShiftHint = definition.code === expectedShiftCode;

                return (
                  <Keycap
                    key={`${definition.code}:${rowIndex}`}
                    definition={definition}
                    isActive={isActive}
                    flashed={flashed}
                    isShiftHint={isShiftHint}
                  />
                );
              })}
            </KeyboardRow>
          ))}
        </div>

        <KeyboardStatus status={status} />
      </div>
    </section>
  );
}

function KeyboardRow({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        flex
        w-full
        min-w-0
        gap-1
        sm:gap-1.5
        lg:gap-2
        2xl:gap-2.5
      "
    >
      {children}
    </div>
  );
}

function KeyboardStatus({
  status,
}: {
  status: ReturnType<typeof useTypingStore.getState>["status"];
}) {
  const message =
    status === "ready"
      ? "Press the highlighted key to begin"
      : status === "paused"
        ? "Paused — press Esc to resume"
        : null;

  if (!message) {
    return null;
  }

  return (
    <p
      className="
        mt-3
        text-center
        font-mono
        text-[0.6875rem]
        font-medium
        tracking-wide
        text-muted-foreground
        sm:mt-4
        sm:text-xs
        lg:mt-5
        2xl:mt-6
      "
    >
      {message}
    </p>
  );
}

function shiftCodeFor(hand: Hand | null): string | null {
  if (hand === "left") {
    return "ShiftLeft";
  }

  if (hand === "right") {
    return "ShiftRight";
  }

  return null;
}

interface KeycapProps {
  definition: KeyDefinition;
  isActive: boolean;
  flashed: "correct" | "incorrect" | null;
  isShiftHint: boolean;
}

function Keycap({ definition, isActive, flashed, isShiftHint }: KeycapProps) {
  const width = definition.width ?? 1;

  const isModifier =
    definition.kind === "modifier" || definition.plain === undefined;

  const isSpace = definition.code === "Space";

  const wideLabel = WIDE_KEY_LABEL[definition.code];

  const subLabel = definition.code
    .replace(/^Key/, "")
    .replace(/^Digit/, "")
    .replace(/^Bracket/, "")
    .toLowerCase();

  const label = getKeyLabel({
    definition,
    isModifier,
    isSpace,
    wideLabel,
    subLabel,
  });

  const stateClass = getKeyStateClass({
    isActive,
    isShiftHint,
    flashed,
  });

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      data-key={definition.code}
      className={[
        // Layout
        "relative",
        "flex",
        "min-w-0",
        "shrink",
        "items-center",
        "justify-center",

        // Responsive height
        "h-10",
        "sm:h-11",
        "lg:h-12",
        "xl:h-12.5",
        "2xl:h-14",

        // Shape
        "overflow-hidden",
        "rounded-lg",
        "border",
        "border-transparent",

        // Typography
        "leading-none",

        // Interaction
        "select-none",
        "transition-[transform,background-color,box-shadow,border-color]",
        "duration-100",
        "ease-out",

        // Focus / accessibility
        "outline-none",

        // State
        stateClass,
      ].join(" ")}
      style={{
        flexGrow: width,
        flexBasis: 0,
      }}
    >
      <KeycapContent>{label}</KeycapContent>
    </button>
  );
}

function KeycapContent({ children }: { children: ReactNode }) {
  return (
    <span
      className="
        flex
        min-w-0
        max-w-full
        items-center
        justify-center
      "
    >
      {children}
    </span>
  );
}

function getKeyLabel({
  definition,
  isModifier,
  isSpace,
  wideLabel,
  subLabel,
}: {
  definition: KeyDefinition;
  isModifier: boolean;
  isSpace: boolean;
  wideLabel: string | undefined;
  subLabel: string;
}): ReactNode {
  if (isSpace) {
    return (
      <span
        className="
          truncate
          px-1
          text-[0.625rem]
          font-semibold
          uppercase
          tracking-[0.12em]
          text-muted-foreground/70
          sm:text-[0.6875rem]
          lg:text-xs
          2xl:text-[0.8125rem]
        "
      >
        space
      </span>
    );
  }

  if (isModifier || wideLabel !== undefined) {
    return (
      <span
        className="
          max-w-full
          truncate
          px-1
          text-[0.625rem]
          font-semibold
          tracking-tight
          text-muted-foreground
          sm:text-[0.6875rem]
          lg:text-xs
          2xl:text-[0.8125rem]
        "
      >
        {wideLabel ?? definition.label}
      </span>
    );
  }

  const primary = definition.plain ?? definition.label;

  const showSublabel =
    primary.toLowerCase() !== subLabel && subLabel.length <= 2;

  return (
    <span
      className="
        flex
        min-w-0
        flex-col
        items-center
        justify-center
        leading-none
      "
    >
      <span
        className="
          font-myanmar
          text-sm
          font-medium
          leading-none
          text-foreground
          sm:text-base
          lg:text-lg
          2xl:text-xl
        "
      >
        {primary}
      </span>

      {showSublabel && (
        <span
          className="
            mt-1
            font-mono
            text-[0.5rem]
            font-medium
            uppercase
            leading-none
            tracking-tight
            text-muted-foreground/65
            sm:text-[0.5625rem]
            lg:text-[0.625rem]
            2xl:text-[0.6875rem]
          "
        >
          {subLabel}
        </span>
      )}
    </span>
  );
}

function getKeyStateClass({
  isActive,
  isShiftHint,
  flashed,
}: {
  isActive: boolean;
  isShiftHint: boolean;
  flashed: "correct" | "incorrect" | null;
}) {
  if (isActive && !isShiftHint) {
    return [
      "z-20",
      "scale-[1.025]",
      "border-brass",
      "bg-brass",
      "font-bold",
      "text-paper",
      "shadow-lg",
      "shadow-brass/20",
      "ring-2",
      "ring-brass",
    ].join(" ");
  }

  if (isShiftHint) {
    return [
      "z-10",
      "border-brass/50",
      "bg-brass/15",
      "text-brass",
      "shadow-sm",
      "ring-1",
      "ring-brass/40",
    ].join(" ");
  }

  if (flashed === "correct") {
    return [
      "border-success",
      "bg-success",
      "text-paper",
      "shadow-md",
      "shadow-success/15",
    ].join(" ");
  }

  if (flashed === "incorrect") {
    return [
      "border-alert",
      "bg-alert",
      "text-paper",
      "shadow-md",
      "shadow-alert/15",
    ].join(" ");
  }

  return [
    "border-border/50",
    "bg-linear-to-b",
    "from-key-top",
    "to-key-base",
    "text-foreground",
    "shadow-sm",
    "ring-1",
    "ring-border/40",
    "hover:border-border",
    "hover:shadow-md",
  ].join(" ");
}
