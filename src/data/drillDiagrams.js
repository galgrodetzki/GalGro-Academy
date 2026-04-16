/**
 * DRILL_DIAGRAMS — map of drill ID → diagram schema.
 *
 * Coordinate reference (see DrillDiagram.jsx):
 *   Goal line y=15, penalty spot (100, 70), 18-yard box y=15→105, x=15→185.
 *   Goal posts at x=75, 125.
 *
 * Element types:
 *   - keeper { x, y, label }
 *   - player { x, y, label, role: "coach" | "striker" }
 *   - cone   { x, y }
 *   - ball   { x, y }
 *   - arrow  { from: [x,y], to: [x,y], kind: "shot" | "pass" | "move" | "cross" }
 *   - label  { x, y, text }
 *
 * When adding new drills: keep schemas minimal. A diagram is an aid, not a
 * replica. Most drills need 3-8 elements max. Avoid label clutter —
 * the pitch outline already implies distances.
 */

export const DRILL_DIAGRAMS = {

  // ── Shot Stopping ──────────────────────────────────────────────

  ss1: {
    // Rapid Fire Triangle: three shooters around the box, 10-12 yds out
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 65, y: 50, label: "1", role: "coach" },
      { type: "player", x: 100, y: 55, label: "2", role: "coach" },
      { type: "player", x: 135, y: 50, label: "3", role: "coach" },
      { type: "ball", x: 65, y: 47 },
      { type: "ball", x: 100, y: 52 },
      { type: "ball", x: 135, y: 47 },
      { type: "arrow", from: [65, 50], to: [88, 20], kind: "shot" },
      { type: "arrow", from: [100, 55], to: [100, 20], kind: "shot" },
      { type: "arrow", from: [135, 50], to: [112, 20], kind: "shot" },
    ],
  },

  ss5: {
    // Ready Position Drill: static stance + single server
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 100, y: 55, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 52 },
      { type: "arrow", from: [100, 55], to: [100, 22], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Feet set · hands up" },
    ],
  },

  ss6: {
    // W-Grip Catching: close server, catches at chest/face
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 100, y: 45, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 42 },
      { type: "arrow", from: [100, 45], to: [92, 22], kind: "pass" },
      { type: "arrow", from: [100, 45], to: [108, 22], kind: "pass" },
      { type: "label", x: 100, y: 125, text: "W-grip · chest & face" },
    ],
  },

  ss9: {
    // Edge of Box Driven Shots: servers at 18-yard line
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 80, y: 100, label: "1", role: "coach" },
      { type: "player", x: 120, y: 100, label: "2", role: "coach" },
      { type: "ball", x: 80, y: 97 },
      { type: "ball", x: 120, y: 97 },
      { type: "arrow", from: [80, 100], to: [80, 20], kind: "shot" },
      { type: "arrow", from: [120, 100], to: [120, 20], kind: "shot" },
      { type: "label", x: 100, y: 118, text: "18 yds · drive through" },
    ],
  },

  // ── Diving ─────────────────────────────────────────────────────

  dv1: {
    // Kneeling Dive Progression
    elements: [
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "player", x: 100, y: 55, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 52 },
      { type: "arrow", from: [100, 55], to: [78, 32], kind: "pass" },
      { type: "arrow", from: [100, 55], to: [122, 32], kind: "pass" },
      { type: "label", x: 100, y: 125, text: "Toss L then R · land side" },
    ],
  },

  dv3: {
    // Power Step + Extension Dive: server forces full stretch
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 100, y: 65, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 62 },
      { type: "arrow", from: [100, 65], to: [68, 18], kind: "shot" },
      { type: "arrow", from: [100, 65], to: [132, 18], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Power step · full extension" },
    ],
  },

  // ── Reflexes ──────────────────────────────────────────────────

  rx4: {
    // Three-Server Rapid Fire: tight arc, no gaps between serves
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 72, y: 50, label: "1", role: "coach" },
      { type: "player", x: 100, y: 50, label: "2", role: "coach" },
      { type: "player", x: 128, y: 50, label: "3", role: "coach" },
      { type: "ball", x: 72, y: 47 },
      { type: "ball", x: 100, y: 47 },
      { type: "ball", x: 128, y: 47 },
      { type: "arrow", from: [72, 50], to: [90, 20], kind: "shot" },
      { type: "arrow", from: [100, 50], to: [105, 18], kind: "shot" },
      { type: "arrow", from: [128, 50], to: [110, 20], kind: "shot" },
    ],
  },

  // ── Footwork ──────────────────────────────────────────────────

  fw1: {
    // 10-Yard Lateral Shuffle
    elements: [
      { type: "cone", x: 65, y: 30 },
      { type: "cone", x: 135, y: 30 },
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "arrow", from: [100, 30], to: [65, 30], kind: "move" },
      { type: "arrow", from: [65, 30], to: [135, 30], kind: "move" },
      { type: "label", x: 100, y: 45, text: "10 yds · shuffle" },
    ],
  },

  fw8: {
    // Post-to-Post Movement
    elements: [
      { type: "keeper", x: 80, y: 22, label: "GK" },
      { type: "arrow", from: [80, 22], to: [120, 22], kind: "move" },
      { type: "cone", x: 76, y: 20 },
      { type: "cone", x: 124, y: 20 },
      { type: "player", x: 100, y: 70, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 72 },
      { type: "label", x: 100, y: 40, text: "Post → post, stay square" },
    ],
  },

  // ── Positioning ──────────────────────────────────────────────

  ps1: {
    // Angle-Setting with Cones
    elements: [
      { type: "cone", x: 55, y: 65 },
      { type: "cone", x: 100, y: 60 },
      { type: "cone", x: 145, y: 65 },
      { type: "keeper", x: 100, y: 28, label: "GK" },
      { type: "arrow", from: [100, 28], to: [82, 22], kind: "move" },
      { type: "arrow", from: [100, 28], to: [118, 22], kind: "move" },
      { type: "arrow", from: [55, 65], to: [82, 20], kind: "shot" },
      { type: "arrow", from: [145, 65], to: [118, 20], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Narrow the angle each side" },
    ],
  },

  ps2: {
    // Near-Post Blocking: shot from tight wide angle
    elements: [
      { type: "player", x: 30, y: 35, label: "C", role: "coach" },
      { type: "ball", x: 30, y: 37 },
      { type: "keeper", x: 82, y: 22, label: "GK" },
      { type: "arrow", from: [30, 35], to: [80, 15], kind: "shot" },
      { type: "arrow", from: [30, 35], to: [118, 18], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Cover near post, trust far" },
    ],
  },

  // ── Distribution ──────────────────────────────────────────────

  ds3: {
    // Goal Kick Accuracy Challenge
    elements: [
      { type: "keeper", x: 100, y: 32, label: "GK" },
      { type: "ball", x: 100, y: 35 },
      { type: "cone", x: 40, y: 130 },
      { type: "cone", x: 100, y: 135 },
      { type: "cone", x: 160, y: 130 },
      { type: "arrow", from: [100, 35], to: [45, 127], kind: "pass" },
      { type: "arrow", from: [100, 35], to: [100, 132], kind: "pass" },
      { type: "arrow", from: [100, 35], to: [155, 127], kind: "pass" },
      { type: "label", x: 100, y: 146, text: "Hit target zones" },
    ],
  },

  ds4: {
    // Playing Through the Press
    elements: [
      { type: "keeper", x: 100, y: 32, label: "GK" },
      { type: "ball", x: 100, y: 35 },
      { type: "player", x: 35, y: 75, label: "T", role: "coach" },
      { type: "player", x: 165, y: 75, label: "T", role: "coach" },
      { type: "player", x: 100, y: 58, label: "S", role: "striker" },
      { type: "arrow", from: [100, 35], to: [40, 72], kind: "pass" },
      { type: "arrow", from: [100, 35], to: [160, 72], kind: "pass" },
      { type: "arrow", from: [100, 58], to: [100, 40], kind: "move" },
      { type: "label", x: 100, y: 125, text: "Scan · release to open side" },
    ],
  },

  ds5: {
    // Underhand Roll Precision
    elements: [
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "ball", x: 100, y: 33 },
      { type: "cone", x: 50, y: 75 },
      { type: "arrow", from: [100, 33], to: [50, 73], kind: "pass" },
      { type: "label", x: 100, y: 125, text: "Roll to feet · flat & accurate" },
    ],
  },

  // ── Crosses ───────────────────────────────────────────────────

  cr1: {
    // Three-Step Footwork to Cross
    elements: [
      { type: "player", x: 22, y: 70, label: "C", role: "coach" },
      { type: "ball", x: 22, y: 72 },
      { type: "keeper", x: 95, y: 25, label: "GK" },
      { type: "arrow", from: [22, 70], to: [105, 28], kind: "cross" },
      { type: "arrow", from: [95, 25], to: [105, 28], kind: "move" },
      { type: "label", x: 100, y: 125, text: "3 steps → plant → rise" },
    ],
  },

  cr3: {
    // Corner Kick Organization
    elements: [
      { type: "player", x: 18, y: 18, label: "C", role: "coach" },
      { type: "ball", x: 18, y: 20 },
      { type: "arrow", from: [18, 18], to: [100, 30], kind: "cross" },
      { type: "keeper", x: 108, y: 20, label: "GK" },
      { type: "player", x: 88, y: 35, label: "S", role: "striker" },
      { type: "player", x: 118, y: 40, label: "S", role: "striker" },
      { type: "label", x: 100, y: 125, text: "Corner · command the box" },
    ],
  },

  // ── 1v1 ───────────────────────────────────────────────────────

  ov1: {
    // 1v1 Closing Down: stay on feet, narrow angle
    elements: [
      { type: "player", x: 100, y: 105, label: "S", role: "striker" },
      { type: "ball", x: 100, y: 103 },
      { type: "arrow", from: [100, 105], to: [100, 70], kind: "move" },
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "arrow", from: [100, 25], to: [100, 55], kind: "move" },
      { type: "label", x: 100, y: 130, text: "Come out · stay on feet" },
    ],
  },

  ov2: {
    // Smother Dive at Feet
    elements: [
      { type: "player", x: 100, y: 100, label: "S", role: "striker" },
      { type: "ball", x: 100, y: 98 },
      { type: "arrow", from: [100, 100], to: [100, 60], kind: "move" },
      { type: "keeper", x: 100, y: 28, label: "GK" },
      { type: "arrow", from: [100, 28], to: [100, 52], kind: "move" },
      { type: "label", x: 100, y: 125, text: "Close · smother at feet" },
    ],
  },

  // ── Set Pieces ────────────────────────────────────────────────

  sp1: {
    // Penalty Routine Practice
    elements: [
      { type: "ball", x: 100, y: 70 },
      { type: "player", x: 100, y: 85, label: "S", role: "striker" },
      { type: "keeper", x: 100, y: 22, label: "GK" },
      { type: "arrow", from: [100, 70], to: [80, 18], kind: "shot" },
      { type: "arrow", from: [100, 70], to: [120, 18], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Penalty spot · 12 yds" },
    ],
  },

  sp2: {
    // Free Kick Wall + Position
    elements: [
      { type: "ball", x: 68, y: 110 },
      { type: "player", x: 75, y: 92, label: "W", role: "striker" },
      { type: "player", x: 82, y: 92, label: "W", role: "striker" },
      { type: "player", x: 89, y: 92, label: "W", role: "striker" },
      { type: "player", x: 96, y: 92, label: "W", role: "striker" },
      { type: "keeper", x: 112, y: 22, label: "GK" },
      { type: "arrow", from: [68, 110], to: [120, 18], kind: "cross" },
      { type: "label", x: 82, y: 105, text: "Wall" },
      { type: "label", x: 145, y: 55, text: "Cover far post" },
    ],
  },
};

export function hasDiagram(drillId) {
  return Object.prototype.hasOwnProperty.call(DRILL_DIAGRAMS, drillId);
}
