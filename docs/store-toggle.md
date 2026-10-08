Design and implement a very compact, minimalist Local / Global store toggle for a web store header.

The toggle must always sit on the LEFT side of the existing “KDrop ₹ INR” selector.

Use an icon-only horizontal pill toggle with two equal segments:

- LEFT = Local, represented by a location pin icon
- RIGHT = Global, represented by a globe icon
- No text labels inside the toggle

Dimensions:

- Width: approximately 64–72px
- Height: approximately 28–32px
- Fully rounded pill shape
- Very subtle neutral background
- Thin subtle border
- Minimal shadow

Active state:

- The active icon should have a small circular or rounded highlight behind it.
- Local active: blue accent + blue/white location-pin icon.
- Global active: purple accent + purple/white globe icon.
- Inactive icon should be muted gray.
- The active icon should be visually obvious through color, background, and a very subtle glow/ring.
- Do not use a large traditional toggle knob.

The toggle should clearly communicate its two states through icon position:

- Local active → highlight is on the LEFT.
- Global active → highlight moves to the RIGHT.

Interaction:

- Clicking the opposite side switches the store.
- The active highlight smoothly moves from left to right or right to left.
- Use a subtle 150–200ms ease-out transition.
- Add a slight hover elevation/background change.
- Add an accessible keyboard focus ring.
- Add tooltips:
  - Location pin: “Local store”
  - Globe: “Global store”

The overall visual style should be:

- Small
- Minimal
- Premium
- Clean
- Lightweight
- Similar to a modern ecommerce header control
- No unnecessary text, borders, or decorative elements

Keep the existing “KDrop ₹ INR” control visually unchanged. The new toggle should complement it rather than compete with it.

The most important requirement is that the current state is immediately recognizable at a glance through the icon + position + color.
