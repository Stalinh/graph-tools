/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { EdgeStyle } from "../../types";
import { CitationEdge } from "./CitationEdge";

const { nodeLookup } = vi.hoisted(() => ({
  nodeLookup: new Map([
    [
      "#1",
      {
        measured: { width: 80, height: 80 },
        internals: { positionAbsolute: { x: 0, y: 0 } },
      },
    ],
    [
      "#2",
      {
        measured: { width: 80, height: 80 },
        internals: { positionAbsolute: { x: 160, y: 0 } },
      },
    ],
  ]),
}));

vi.mock("@xyflow/react", () => ({
  useStore: (selector: (state: { nodeLookup: typeof nodeLookup }) => unknown) =>
    selector({ nodeLookup }),
  useStoreApi: () => ({
    getState: () => ({ transform: [0, 0, 1] }),
  }),
}));

function renderCitationEdge(style: EdgeStyle | undefined) {
  const props = {
    id: `edge-${style ?? "legacy"}`,
    source: "#1",
    target: "#2",
    sourceX: 40,
    sourceY: 40,
    targetX: 160,
    targetY: 40,
    interactionWidth: 40,
    style: { strokeWidth: 1.8, opacity: 1 },
    data: {
      direction: "unidirectional",
      selected: false,
      style,
      color: "amber",
    },
  } as ComponentProps<typeof CitationEdge>;

  return render(
    <svg>
      <CitationEdge {...props} />
    </svg>
  );
}

describe("CitationEdge", () => {
  it("renders solid edges without note dash stroke data", () => {
    const { container } = renderCitationEdge("solid");

    expect(container.querySelector(".graph-edge--style-solid")).not.toBeNull();
    expect(
      container.querySelector(".edge-visible-path")?.getAttribute("stroke-dasharray")
    ).toBeNull();
  });

  it("renders note dash for explicit and legacy styles", () => {
    const explicit = renderCitationEdge("note-dash");
    const legacy = renderCitationEdge(undefined);

    expect(
      explicit.container
        .querySelector(".graph-edge--style-note-dash .edge-visible-path")
        ?.getAttribute("stroke-dasharray")
    ).toBe("15 7 3 6");
    expect(legacy.container.querySelector(".graph-edge--style-note-dash")).not.toBeNull();
  });
});
