import type { FingerId } from "../types";
import { useTypingStore } from "../stores/typing-store";

interface FingerShape {
  id: FingerId;
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const LEFT_FINGERS: FingerShape[] = [
  { id: "left-pinky", name: "Pinky", x1: 76, y1: 112, x2: 76, y2: 34 },
  { id: "left-ring", name: "Ring", x1: 96, y1: 114, x2: 96, y2: 26 },
  { id: "left-middle", name: "Middle", x1: 117, y1: 118, x2: 117, y2: 22 },
  { id: "left-index", name: "Index", x1: 138, y1: 118, x2: 138, y2: 30 },
];

const RIGHT_FINGERS: FingerShape[] = [
  { id: "right-index", name: "Index", x1: 402, y1: 118, x2: 402, y2: 30 },
  { id: "right-middle", name: "Middle", x1: 423, y1: 118, x2: 423, y2: 22 },
  { id: "right-ring", name: "Ring", x1: 444, y1: 114, x2: 444, y2: 26 },
  { id: "right-pinky", name: "Pinky", x1: 464, y1: 112, x2: 464, y2: 34 },
];

function Hand({
  side,
  active,
  fingers,
  thumbX1,
  thumbY1,
  thumbX2,
  thumbY2,
}: {
  side: "L" | "R";
  active: FingerId | null;
  fingers: FingerShape[];
  thumbX1: number;
  thumbY1: number;
  thumbX2: number;
  thumbY2: number;
}) {
  const palmCx = side === "L" ? 110 : 390;
  const palmCy = 168;
  const activeThumb = active === (side === "L" ? "left-thumb" : "right-thumb");

  return (
    <svg viewBox={side === "L" ? "0 0 200 250" : "300 0 200 250"} className="h-44 w-40" aria-hidden>
      <g>
        {fingers.map((finger) => {
          const isActive = active === finger.id;
          return (
            <g key={finger.id}>
              <line
                x1={finger.x1}
                y1={finger.y1}
                x2={finger.x2}
                y2={finger.y2}
                stroke={isActive ? "var(--accent)" : "var(--paper-2)"}
                strokeWidth={24}
                strokeLinecap="round"
              />
              <line
                x1={finger.x1}
                y1={finger.y1}
                x2={finger.x2}
                y2={finger.y2}
                stroke={isActive ? "var(--accent-strong)" : "var(--line-strong)"}
                strokeWidth={2}
              />
              {isActive ? (
                <circle cx={finger.x2} cy={finger.y2} r={7} fill="var(--brass)">
                  <animate attributeName="r" values="5;9;5" dur="1.1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.95;0.5;0.95" dur="1.1s" repeatCount="indefinite" />
                </circle>
              ) : null}
              <text
                x={finger.x1}
                y={finger.y1 + 18}
                textAnchor="middle"
                fontSize="8"
                fill={isActive ? "var(--accent)" : "var(--ink-faint)"}
                fontFamily="ui-monospace, monospace"
              >
                {finger.name}
              </text>
            </g>
          );
        })}
        <g>
          <line
            x1={thumbX1}
            y1={thumbY1}
            x2={thumbX2}
            y2={thumbY2}
            stroke={activeThumb ? "var(--accent)" : "var(--paper-2)"}
            strokeWidth={26}
            strokeLinecap="round"
          />
          <line
            x1={thumbX1}
            y1={thumbY1}
            x2={thumbX2}
            y2={thumbY2}
            stroke={activeThumb ? "var(--accent-strong)" : "var(--line-strong)"}
            strokeWidth={2}
          />
          {activeThumb ? (
            <circle cx={thumbX2} cy={thumbY2} r={7} fill="var(--brass)">
              <animate attributeName="r" values="5;9;5" dur="1.1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.95;0.5;0.95" dur="1.1s" repeatCount="indefinite" />
            </circle>
          ) : null}
        </g>
        <ellipse cx={palmCx} cy={palmCy} rx={56} ry={72} fill="var(--paper-2)" stroke="var(--line-strong)" strokeWidth={2} />
        <rect x={palmCx - 38} y={palmCy + 40} width={76} height={44} rx={22} fill="var(--paper-2)" stroke="var(--line-strong)" strokeWidth={2} />
        <text
          x={palmCx}
          y={palmCy + 100}
          textAnchor="middle"
          fontSize="10"
          fill="var(--ink-faint)"
          fontFamily="ui-monospace, monospace"
        >
          {side}
        </text>
        <text x={palmCx} y={palmCy - 96} textAnchor="middle" fontSize="9" fill="var(--ink-faint)">
          {active ? fingerName(active) : ""}
        </text>
      </g>
    </svg>
  );
}

function fingerName(finger: FingerId): string {
  const map: Record<FingerId, string> = {
    "left-pinky": "Left pinky",
    "left-ring": "Left ring",
    "left-middle": "Left middle",
    "left-index": "Left index",
    "right-index": "Right index",
    "right-middle": "Right middle",
    "right-ring": "Right ring",
    "right-pinky": "Right pinky",
    "left-thumb": "Left thumb · Space",
    "right-thumb": "Right thumb · Space",
  };
  return map[finger];
}

export function HandGuide() {
  const tick = useTypingStore((s) => s.tick);
  void tick;
  const engine = useTypingStore.getState().engine;
  const expected = engine?.expectedUnit ?? null;
  let active: FingerId | null = null;
  if (expected) {
    const layout = useTypingStore.getState().session?.layout ?? null;
    active = layout?.getKey(expected.keyCode)?.finger ?? null;
  }

  return (
    <div className="flex items-center justify-center gap-2" aria-label="Hand guide">
      <Hand
        side="L"
        active={active}
        fingers={LEFT_FINGERS}
        thumbX1={88}
        thumbY1={158}
        thumbX2={34}
        thumbY2={112}
      />
      <Hand
        side="R"
        active={active}
        fingers={RIGHT_FINGERS}
        thumbX1={411}
        thumbY1={158}
        thumbX2={465}
        thumbY2={112}
      />
    </div>
  );
}