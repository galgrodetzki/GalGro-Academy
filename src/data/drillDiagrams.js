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

  // ── Shot Stopping (remainder) ────────────────────────────────

  ss2: {
    // Close-Range Volleys: single server, 6-8 yds, varying heights
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 100, y: 42, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 39 },
      { type: "arrow", from: [100, 42], to: [88, 18], kind: "shot" },
      { type: "arrow", from: [100, 42], to: [100, 15], kind: "shot" },
      { type: "arrow", from: [100, 42], to: [112, 20], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Mixed heights · no breaks" },
    ],
  },

  ss3: {
    // Save + Rebound Pressure: initial shot, follow-up
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 85, y: 65, label: "1", role: "coach" },
      { type: "player", x: 125, y: 55, label: "2", role: "coach" },
      { type: "ball", x: 85, y: 62 },
      { type: "ball", x: 125, y: 52 },
      { type: "arrow", from: [85, 65], to: [92, 20], kind: "shot" },
      { type: "arrow", from: [125, 55], to: [110, 18], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Save · reset · save again" },
    ],
  },

  ss4: {
    // Long-Range Shot Handling: 22-25 yds out
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 80, y: 125, label: "1", role: "coach" },
      { type: "player", x: 120, y: 125, label: "2", role: "coach" },
      { type: "ball", x: 80, y: 122 },
      { type: "ball", x: 120, y: 122 },
      { type: "arrow", from: [80, 125], to: [85, 18], kind: "shot" },
      { type: "arrow", from: [120, 125], to: [115, 18], kind: "shot" },
      { type: "label", x: 100, y: 140, text: "25 yds · commit late" },
    ],
  },

  ss7: {
    // Pass Combo into Shot: pass → lay-off → shot
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 60, y: 70, label: "1", role: "coach" },
      { type: "player", x: 100, y: 90, label: "2", role: "coach" },
      { type: "player", x: 140, y: 60, label: "3", role: "coach" },
      { type: "ball", x: 60, y: 72 },
      { type: "arrow", from: [60, 70], to: [100, 90], kind: "pass" },
      { type: "arrow", from: [100, 90], to: [140, 60], kind: "pass" },
      { type: "arrow", from: [140, 60], to: [110, 18], kind: "shot" },
    ],
  },

  ss8: {
    // Live Shooting Game: multiple free-form servers
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 55, y: 60, label: "1", role: "coach" },
      { type: "player", x: 100, y: 75, label: "2", role: "coach" },
      { type: "player", x: 145, y: 60, label: "3", role: "coach" },
      { type: "player", x: 80, y: 100, label: "4", role: "coach" },
      { type: "ball", x: 100, y: 73 },
      { type: "arrow", from: [100, 75], to: [100, 20], kind: "shot" },
      { type: "label", x: 100, y: 130, text: "Live · unpredictable" },
    ],
  },

  ss10: {
    // Screened Shot Reactions: wall of players blocks view
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 90, y: 55, label: "D", role: "striker" },
      { type: "player", x: 98, y: 55, label: "D", role: "striker" },
      { type: "player", x: 106, y: 55, label: "D", role: "striker" },
      { type: "player", x: 100, y: 90, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 87 },
      { type: "arrow", from: [100, 90], to: [92, 18], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Screen · late sighting" },
    ],
  },

  ss11: {
    // High Ball + Low Shot Combo: sequence
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 35, y: 80, label: "1", role: "coach" },
      { type: "player", x: 100, y: 65, label: "2", role: "coach" },
      { type: "ball", x: 35, y: 82 },
      { type: "ball", x: 100, y: 62 },
      { type: "arrow", from: [35, 80], to: [100, 25], kind: "cross" },
      { type: "arrow", from: [100, 65], to: [85, 20], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Claim high · save low" },
    ],
  },

  // ── Diving (remainder) ────────────────────────────────────────

  dv2: {
    // Collapse Dive Technique: low, close server
    elements: [
      { type: "keeper", x: 100, y: 28, label: "GK" },
      { type: "player", x: 100, y: 50, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 48 },
      { type: "arrow", from: [100, 50], to: [72, 30], kind: "pass" },
      { type: "arrow", from: [100, 50], to: [128, 30], kind: "pass" },
      { type: "label", x: 100, y: 125, text: "Knee drop · strong hands" },
    ],
  },

  dv4: {
    // Recovery Dive Sequence: first save then recover to block
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 100, y: 60, label: "C", role: "coach" },
      { type: "ball", x: 75, y: 45 },
      { type: "ball", x: 125, y: 45 },
      { type: "arrow", from: [100, 60], to: [75, 32], kind: "shot" },
      { type: "arrow", from: [75, 40], to: [125, 32], kind: "move" },
      { type: "label", x: 100, y: 125, text: "Save · recover · save again" },
    ],
  },

  dv5: {
    // Three-Ball Sequence: three balls placed, three dives
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "ball", x: 65, y: 40 },
      { type: "ball", x: 100, y: 45 },
      { type: "ball", x: 135, y: 40 },
      { type: "cone", x: 65, y: 48 },
      { type: "cone", x: 100, y: 52 },
      { type: "cone", x: 135, y: 48 },
      { type: "label", x: 100, y: 125, text: "Dive left · centre · right" },
    ],
  },

  dv6: {
    // Side-Shuffle to Dive
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "cone", x: 80, y: 25 },
      { type: "cone", x: 120, y: 25 },
      { type: "arrow", from: [100, 25], to: [80, 25], kind: "move" },
      { type: "player", x: 100, y: 55, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 52 },
      { type: "arrow", from: [100, 55], to: [68, 28], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Shuffle then dive" },
    ],
  },

  dv7: {
    // High Extension Saves: high tosses to top corners
    elements: [
      { type: "keeper", x: 100, y: 28, label: "GK" },
      { type: "player", x: 100, y: 60, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 57 },
      { type: "arrow", from: [100, 60], to: [78, 10], kind: "pass" },
      { type: "arrow", from: [100, 60], to: [122, 10], kind: "pass" },
      { type: "label", x: 100, y: 125, text: "Top corners · full stretch" },
    ],
  },

  dv8: {
    // 45-Degree Angle Focus Drill
    elements: [
      { type: "keeper", x: 100, y: 28, label: "GK" },
      { type: "player", x: 65, y: 65, label: "C", role: "coach" },
      { type: "ball", x: 65, y: 67 },
      { type: "arrow", from: [65, 65], to: [115, 22], kind: "shot" },
      { type: "cone", x: 80, y: 45 },
      { type: "label", x: 100, y: 125, text: "45° angle · dive across" },
    ],
  },

  dv9: {
    // Reverse Cross-Step + Collapse
    elements: [
      { type: "keeper", x: 90, y: 25, label: "GK" },
      { type: "arrow", from: [90, 25], to: [115, 30], kind: "move" },
      { type: "player", x: 100, y: 55, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 52 },
      { type: "arrow", from: [100, 55], to: [128, 32], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Cross-step · collapse dive" },
    ],
  },

  // ── Reflexes (remainder) ──────────────────────────────────────

  rx1: {
    // Tennis Ball Drop Reactions
    elements: [
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "player", x: 100, y: 45, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 42 },
      { type: "arrow", from: [100, 45], to: [80, 40], kind: "pass" },
      { type: "arrow", from: [100, 45], to: [120, 40], kind: "pass" },
      { type: "label", x: 100, y: 125, text: "Drop · react · catch" },
    ],
  },

  rx2: {
    // Rebounder Rapid Fire
    elements: [
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "cone", x: 75, y: 55 },
      { type: "cone", x: 100, y: 55 },
      { type: "cone", x: 125, y: 55 },
      { type: "arrow", from: [75, 55], to: [85, 30], kind: "shot" },
      { type: "arrow", from: [100, 55], to: [105, 25], kind: "shot" },
      { type: "arrow", from: [125, 55], to: [115, 30], kind: "shot" },
      { type: "label", x: 100, y: 75, text: "Rebounder" },
      { type: "label", x: 100, y: 125, text: "Unpredictable angles" },
    ],
  },

  rx3: {
    // Reaction Ball Wall Drill
    elements: [
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "ball", x: 100, y: 55 },
      { type: "arrow", from: [100, 55], to: [82, 32], kind: "shot" },
      { type: "arrow", from: [100, 55], to: [118, 32], kind: "shot" },
      { type: "label", x: 100, y: 70, text: "Reaction ball" },
      { type: "label", x: 100, y: 125, text: "Random bounce off wall" },
    ],
  },

  rx5: {
    // Deflection Save Drill: shot through deflector
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 100, y: 90, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 87 },
      { type: "player", x: 95, y: 60, label: "D", role: "striker" },
      { type: "arrow", from: [100, 90], to: [95, 60], kind: "shot" },
      { type: "arrow", from: [95, 60], to: [115, 22], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Shot deflects · react late" },
    ],
  },

  rx6: {
    // Sound Cue Reaction Drill
    elements: [
      { type: "keeper", x: 100, y: 28, label: "GK" },
      { type: "player", x: 100, y: 55, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 52 },
      { type: "arrow", from: [100, 55], to: [78, 22], kind: "shot" },
      { type: "arrow", from: [100, 55], to: [122, 22], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "\"Left!\" / \"Right!\" · react" },
    ],
  },

  rx7: {
    // Close-Range Point-Blank Fire
    elements: [
      { type: "keeper", x: 100, y: 28, label: "GK" },
      { type: "player", x: 100, y: 42, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 40 },
      { type: "arrow", from: [100, 42], to: [85, 22], kind: "shot" },
      { type: "arrow", from: [100, 42], to: [115, 22], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "3-5 yds · pure reflex" },
    ],
  },

  rx8: {
    // Mirror Reaction Drill
    elements: [
      { type: "keeper", x: 85, y: 30, label: "GK" },
      { type: "player", x: 115, y: 30, label: "C", role: "coach" },
      { type: "arrow", from: [115, 30], to: [125, 28], kind: "move" },
      { type: "arrow", from: [85, 30], to: [95, 28], kind: "move" },
      { type: "label", x: 100, y: 125, text: "Mirror partner's movement" },
    ],
  },

  rx9: {
    // Agility Ladder + Reaction Save
    elements: [
      { type: "cone", x: 85, y: 50 },
      { type: "cone", x: 92, y: 50 },
      { type: "cone", x: 99, y: 50 },
      { type: "cone", x: 106, y: 50 },
      { type: "cone", x: 113, y: 50 },
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "player", x: 100, y: 75, label: "C", role: "coach" },
      { type: "arrow", from: [100, 75], to: [90, 22], kind: "shot" },
      { type: "label", x: 100, y: 65, text: "Ladder" },
    ],
  },

  // ── Footwork (remainder) ──────────────────────────────────────

  fw2: {
    // T-Drill Footwork
    elements: [
      { type: "cone", x: 100, y: 30 },
      { type: "cone", x: 70, y: 55 },
      { type: "cone", x: 100, y: 55 },
      { type: "cone", x: 130, y: 55 },
      { type: "arrow", from: [100, 30], to: [100, 55], kind: "move" },
      { type: "arrow", from: [100, 55], to: [70, 55], kind: "move" },
      { type: "arrow", from: [70, 55], to: [130, 55], kind: "move" },
      { type: "label", x: 100, y: 80, text: "T-shape footwork" },
    ],
  },

  fw3: {
    // Agility Ladder In-and-Out
    elements: [
      { type: "keeper", x: 100, y: 28, label: "GK" },
      { type: "cone", x: 85, y: 50 }, { type: "cone", x: 115, y: 50 },
      { type: "cone", x: 85, y: 60 }, { type: "cone", x: 115, y: 60 },
      { type: "cone", x: 85, y: 70 }, { type: "cone", x: 115, y: 70 },
      { type: "cone", x: 85, y: 80 }, { type: "cone", x: 115, y: 80 },
      { type: "arrow", from: [100, 28], to: [100, 85], kind: "move" },
      { type: "label", x: 100, y: 125, text: "In-out feet · stay low" },
    ],
  },

  fw4: {
    // Box Shuffle Drill: 4 cones in a box
    elements: [
      { type: "cone", x: 75, y: 35 },
      { type: "cone", x: 125, y: 35 },
      { type: "cone", x: 125, y: 75 },
      { type: "cone", x: 75, y: 75 },
      { type: "keeper", x: 100, y: 55, label: "GK" },
      { type: "arrow", from: [75, 35], to: [125, 35], kind: "move" },
      { type: "arrow", from: [125, 35], to: [125, 75], kind: "move" },
      { type: "arrow", from: [125, 75], to: [75, 75], kind: "move" },
      { type: "arrow", from: [75, 75], to: [75, 35], kind: "move" },
    ],
  },

  fw5: {
    // Basic Footwork Ladder Patterns
    elements: [
      { type: "cone", x: 85, y: 45 }, { type: "cone", x: 115, y: 45 },
      { type: "cone", x: 85, y: 60 }, { type: "cone", x: 115, y: 60 },
      { type: "cone", x: 85, y: 75 }, { type: "cone", x: 115, y: 75 },
      { type: "cone", x: 85, y: 90 }, { type: "cone", x: 115, y: 90 },
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "arrow", from: [100, 30], to: [100, 95], kind: "move" },
      { type: "label", x: 100, y: 125, text: "Quick feet · patterns" },
    ],
  },

  fw6: {
    // Reactive Direction Changes
    elements: [
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "player", x: 100, y: 65, label: "C", role: "coach" },
      { type: "arrow", from: [100, 30], to: [70, 30], kind: "move" },
      { type: "arrow", from: [100, 30], to: [130, 30], kind: "move" },
      { type: "label", x: 100, y: 125, text: "Coach points · react" },
    ],
  },

  fw7: {
    // Lateral Bound Power Drill
    elements: [
      { type: "cone", x: 70, y: 40 },
      { type: "cone", x: 100, y: 40 },
      { type: "cone", x: 130, y: 40 },
      { type: "keeper", x: 70, y: 40, label: "GK" },
      { type: "arrow", from: [70, 40], to: [100, 40], kind: "move" },
      { type: "arrow", from: [100, 40], to: [130, 40], kind: "move" },
      { type: "label", x: 100, y: 65, text: "Explosive side bounds" },
    ],
  },

  fw9: {
    // Pressure Advance & Recovery
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "arrow", from: [100, 25], to: [100, 55], kind: "move" },
      { type: "arrow", from: [100, 55], to: [100, 25], kind: "move" },
      { type: "player", x: 100, y: 90, label: "C", role: "coach" },
      { type: "label", x: 100, y: 125, text: "Step out · step back" },
    ],
  },

  fw10: {
    // Shuffle + Low Drive Save
    elements: [
      { type: "keeper", x: 85, y: 28, label: "GK" },
      { type: "arrow", from: [85, 28], to: [115, 28], kind: "move" },
      { type: "player", x: 100, y: 60, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 57 },
      { type: "arrow", from: [100, 60], to: [125, 22], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Shuffle · then dive low" },
    ],
  },

  // ── Positioning (remainder) ──────────────────────────────────

  ps3: {
    // Multi-Angle Shooting Pressure
    elements: [
      { type: "keeper", x: 100, y: 28, label: "GK" },
      { type: "player", x: 50, y: 65, label: "1", role: "coach" },
      { type: "player", x: 100, y: 80, label: "2", role: "coach" },
      { type: "player", x: 150, y: 65, label: "3", role: "coach" },
      { type: "arrow", from: [50, 65], to: [85, 20], kind: "shot" },
      { type: "arrow", from: [100, 80], to: [100, 18], kind: "shot" },
      { type: "arrow", from: [150, 65], to: [115, 20], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Read · adjust · save" },
    ],
  },

  ps4: {
    // Sweeper-Keeper High Line
    elements: [
      { type: "keeper", x: 100, y: 55, label: "GK" },
      { type: "player", x: 100, y: 125, label: "S", role: "striker" },
      { type: "ball", x: 100, y: 100 },
      { type: "arrow", from: [100, 125], to: [100, 100], kind: "pass" },
      { type: "arrow", from: [100, 55], to: [100, 85], kind: "move" },
      { type: "label", x: 100, y: 140, text: "Sweep ahead of line" },
    ],
  },

  ps5: {
    // Multi-Threat Coverage
    elements: [
      { type: "keeper", x: 100, y: 28, label: "GK" },
      { type: "player", x: 70, y: 60, label: "S", role: "striker" },
      { type: "player", x: 130, y: 60, label: "S", role: "striker" },
      { type: "player", x: 100, y: 85, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 82 },
      { type: "arrow", from: [100, 85], to: [70, 60], kind: "pass" },
      { type: "arrow", from: [100, 85], to: [130, 60], kind: "pass" },
      { type: "label", x: 100, y: 125, text: "Cover multiple options" },
    ],
  },

  ps6: {
    // Rapid Recovery & Rebound Position
    elements: [
      { type: "keeper", x: 90, y: 22, label: "GK" },
      { type: "player", x: 100, y: 60, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 57 },
      { type: "arrow", from: [100, 60], to: [78, 22], kind: "shot" },
      { type: "arrow", from: [78, 22], to: [120, 22], kind: "move" },
      { type: "label", x: 100, y: 125, text: "Save · reset · block rebound" },
    ],
  },

  // ── Distribution (remainder) ──────────────────────────────────

  ds1: {
    // Drop-Kick Target Zones
    elements: [
      { type: "keeper", x: 100, y: 32, label: "GK" },
      { type: "ball", x: 100, y: 35 },
      { type: "cone", x: 40, y: 135 },
      { type: "cone", x: 160, y: 135 },
      { type: "arrow", from: [100, 35], to: [45, 132], kind: "pass" },
      { type: "arrow", from: [100, 35], to: [155, 132], kind: "pass" },
      { type: "label", x: 100, y: 146, text: "Drop-kick to zones" },
    ],
  },

  ds2: {
    // Javelin/Overarm Throw
    elements: [
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "ball", x: 100, y: 33 },
      { type: "cone", x: 55, y: 90 },
      { type: "cone", x: 145, y: 90 },
      { type: "arrow", from: [100, 33], to: [60, 87], kind: "pass" },
      { type: "arrow", from: [100, 33], to: [140, 87], kind: "pass" },
      { type: "label", x: 100, y: 125, text: "Overarm · flat · to chest" },
    ],
  },

  ds6: {
    // Save + Counter-Launch
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 100, y: 70, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 67 },
      { type: "arrow", from: [100, 70], to: [100, 22], kind: "shot" },
      { type: "cone", x: 170, y: 130 },
      { type: "arrow", from: [100, 28], to: [165, 128], kind: "pass" },
      { type: "label", x: 100, y: 145, text: "Save · launch counter" },
    ],
  },

  ds7: {
    // Passing Circuit with Coach
    elements: [
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "player", x: 55, y: 75, label: "C", role: "coach" },
      { type: "player", x: 145, y: 75, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 33 },
      { type: "arrow", from: [100, 33], to: [60, 72], kind: "pass" },
      { type: "arrow", from: [55, 75], to: [100, 30], kind: "pass" },
      { type: "arrow", from: [100, 33], to: [140, 72], kind: "pass" },
      { type: "label", x: 100, y: 125, text: "Short · sharp · both feet" },
    ],
  },

  ds8: {
    // Both-Feet Kicking Mastery
    elements: [
      { type: "keeper", x: 100, y: 32, label: "GK" },
      { type: "ball", x: 100, y: 35 },
      { type: "cone", x: 55, y: 125 },
      { type: "cone", x: 145, y: 125 },
      { type: "arrow", from: [100, 35], to: [60, 122], kind: "pass" },
      { type: "arrow", from: [100, 35], to: [140, 122], kind: "pass" },
      { type: "label", x: 100, y: 140, text: "Left foot · right foot" },
    ],
  },

  ds9: {
    // Back-Pass Build-Out
    elements: [
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "player", x: 100, y: 75, label: "D", role: "coach" },
      { type: "ball", x: 100, y: 72 },
      { type: "arrow", from: [100, 75], to: [100, 33], kind: "pass" },
      { type: "player", x: 40, y: 85, label: "T", role: "coach" },
      { type: "arrow", from: [100, 33], to: [45, 82], kind: "pass" },
      { type: "label", x: 100, y: 125, text: "Receive · scan · build out" },
    ],
  },

  ds10: {
    // Half-Volley Width Switch
    elements: [
      { type: "keeper", x: 100, y: 32, label: "GK" },
      { type: "ball", x: 100, y: 35 },
      { type: "player", x: 40, y: 80, label: "C", role: "coach" },
      { type: "arrow", from: [40, 80], to: [100, 33], kind: "pass" },
      { type: "cone", x: 170, y: 100 },
      { type: "arrow", from: [100, 35], to: [165, 97], kind: "pass" },
      { type: "label", x: 100, y: 130, text: "Receive L · switch R" },
    ],
  },

  // ── Crosses (remainder) ───────────────────────────────────────

  cr2: {
    // Catch vs Punch Decision
    elements: [
      { type: "player", x: 22, y: 70, label: "C", role: "coach" },
      { type: "ball", x: 22, y: 72 },
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "arrow", from: [22, 70], to: [100, 25], kind: "cross" },
      { type: "player", x: 90, y: 40, label: "S", role: "striker" },
      { type: "player", x: 110, y: 40, label: "S", role: "striker" },
      { type: "label", x: 100, y: 125, text: "Read traffic · catch or punch" },
    ],
  },

  cr4: {
    // Crosses Under Fatigue
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "arrow", from: [100, 25], to: [140, 60], kind: "move" },
      { type: "arrow", from: [140, 60], to: [100, 25], kind: "move" },
      { type: "player", x: 22, y: 70, label: "C", role: "coach" },
      { type: "ball", x: 22, y: 72 },
      { type: "arrow", from: [22, 70], to: [105, 28], kind: "cross" },
      { type: "label", x: 100, y: 125, text: "Sprint · recover · claim" },
    ],
  },

  cr5: {
    // Switching Crossing Zones
    elements: [
      { type: "player", x: 22, y: 75, label: "1", role: "coach" },
      { type: "ball", x: 22, y: 77 },
      { type: "player", x: 178, y: 75, label: "2", role: "coach" },
      { type: "ball", x: 178, y: 77 },
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "arrow", from: [22, 75], to: [100, 28], kind: "cross" },
      { type: "arrow", from: [178, 75], to: [100, 28], kind: "cross" },
      { type: "label", x: 100, y: 125, text: "Crosses from both wings" },
    ],
  },

  cr6: {
    // Contested Cross Claiming
    elements: [
      { type: "player", x: 22, y: 70, label: "C", role: "coach" },
      { type: "ball", x: 22, y: 72 },
      { type: "arrow", from: [22, 70], to: [100, 28], kind: "cross" },
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 90, y: 38, label: "S", role: "striker" },
      { type: "player", x: 108, y: 42, label: "S", role: "striker" },
      { type: "player", x: 118, y: 35, label: "S", role: "striker" },
      { type: "label", x: 100, y: 125, text: "Through traffic · strong claim" },
    ],
  },

  cr7: {
    // High-Pressure Corner Sequence
    elements: [
      { type: "player", x: 18, y: 18, label: "1", role: "coach" },
      { type: "player", x: 182, y: 18, label: "2", role: "coach" },
      { type: "ball", x: 18, y: 20 },
      { type: "ball", x: 182, y: 20 },
      { type: "arrow", from: [18, 18], to: [100, 30], kind: "cross" },
      { type: "arrow", from: [182, 18], to: [100, 30], kind: "cross" },
      { type: "keeper", x: 108, y: 20, label: "GK" },
      { type: "label", x: 100, y: 125, text: "Rapid alternating corners" },
    ],
  },

  // ── 1v1 (remainder) ───────────────────────────────────────────

  ov3: {
    // Stay-on-Feet 1v1 Game: coach starts wide, keeper stays big
    elements: [
      { type: "player", x: 40, y: 100, label: "S", role: "striker" },
      { type: "ball", x: 40, y: 102 },
      { type: "arrow", from: [40, 100], to: [95, 65], kind: "move" },
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "arrow", from: [100, 25], to: [100, 50], kind: "move" },
      { type: "label", x: 100, y: 125, text: "Stay on feet · force decision" },
    ],
  },

  ov4: {
    // 1v1 After Sweeping Recovery: sprint out, recover, face 1v1
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "cone", x: 100, y: 105 },
      { type: "arrow", from: [100, 25], to: [100, 100], kind: "move" },
      { type: "arrow", from: [100, 100], to: [100, 40], kind: "move" },
      { type: "player", x: 100, y: 90, label: "S", role: "striker" },
      { type: "ball", x: 100, y: 87 },
      { type: "label", x: 100, y: 125, text: "Sweep · recover · face 1v1" },
    ],
  },

  ov5: {
    // 1v1 From Different Angles
    elements: [
      { type: "keeper", x: 100, y: 28, label: "GK" },
      { type: "player", x: 50, y: 90, label: "1", role: "striker" },
      { type: "player", x: 100, y: 105, label: "2", role: "striker" },
      { type: "player", x: 150, y: 90, label: "3", role: "striker" },
      { type: "arrow", from: [50, 90], to: [80, 30], kind: "move" },
      { type: "arrow", from: [100, 105], to: [100, 50], kind: "move" },
      { type: "arrow", from: [150, 90], to: [120, 30], kind: "move" },
      { type: "label", x: 100, y: 125, text: "Different angles · adjust early" },
    ],
  },

  ov6: {
    // Controlled Advance Decision: coach dribbles, call "set"
    elements: [
      { type: "player", x: 100, y: 120, label: "S", role: "striker" },
      { type: "ball", x: 100, y: 117 },
      { type: "arrow", from: [100, 120], to: [100, 70], kind: "move" },
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "arrow", from: [100, 25], to: [100, 55], kind: "move" },
      { type: "cone", x: 100, y: 55 },
      { type: "label", x: 100, y: 140, text: "Come out · set · be big" },
    ],
  },

  // ── Set Pieces (remainder) ───────────────────────────────────

  sp3: {
    // Post-Corner Transition Save
    elements: [
      { type: "player", x: 18, y: 18, label: "C", role: "coach" },
      { type: "ball", x: 18, y: 20 },
      { type: "arrow", from: [18, 18], to: [100, 30], kind: "cross" },
      { type: "player", x: 100, y: 45, label: "S", role: "striker" },
      { type: "arrow", from: [100, 45], to: [90, 20], kind: "shot" },
      { type: "keeper", x: 105, y: 22, label: "GK" },
      { type: "label", x: 100, y: 125, text: "Cross clears · second save" },
    ],
  },

  sp4: {
    // Full Penalty Shootout Sim
    elements: [
      { type: "ball", x: 100, y: 70 },
      { type: "player", x: 100, y: 90, label: "S", role: "striker" },
      { type: "keeper", x: 100, y: 22, label: "GK" },
      { type: "arrow", from: [100, 70], to: [78, 20], kind: "shot" },
      { type: "arrow", from: [100, 70], to: [100, 15], kind: "shot" },
      { type: "arrow", from: [100, 70], to: [122, 20], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "5 pens · pick a side" },
    ],
  },

  sp5: {
    // Set-Piece Mental Walk-Through (abstract — just positioning)
    elements: [
      { type: "keeper", x: 100, y: 22, label: "GK" },
      { type: "player", x: 85, y: 35, label: "D", role: "coach" },
      { type: "player", x: 115, y: 35, label: "D", role: "coach" },
      { type: "player", x: 75, y: 45, label: "D", role: "coach" },
      { type: "player", x: 125, y: 45, label: "D", role: "coach" },
      { type: "label", x: 100, y: 125, text: "Mental walk-through · no ball" },
    ],
  },

  // ── Communication ─────────────────────────────────────────────

  cm1: {
    // Verbal Box Communication
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 70, y: 45, label: "D", role: "coach" },
      { type: "player", x: 130, y: 45, label: "D", role: "coach" },
      { type: "player", x: 100, y: 90, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 87 },
      { type: "arrow", from: [100, 90], to: [100, 25], kind: "cross" },
      { type: "label", x: 100, y: 125, text: "Loud calls · direct line" },
    ],
  },

  cm2: {
    // Back Line Direction (No Ball)
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 50, y: 60, label: "D", role: "coach" },
      { type: "player", x: 85, y: 60, label: "D", role: "coach" },
      { type: "player", x: 115, y: 60, label: "D", role: "coach" },
      { type: "player", x: 150, y: 60, label: "D", role: "coach" },
      { type: "arrow", from: [100, 25], to: [50, 55], kind: "move" },
      { type: "arrow", from: [100, 25], to: [150, 55], kind: "move" },
      { type: "label", x: 100, y: 125, text: "Direct the line · no ball" },
    ],
  },

  cm3: {
    // Communication Under Fatigue
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "arrow", from: [100, 25], to: [140, 50], kind: "move" },
      { type: "arrow", from: [140, 50], to: [100, 25], kind: "move" },
      { type: "player", x: 70, y: 60, label: "D", role: "coach" },
      { type: "player", x: 130, y: 60, label: "D", role: "coach" },
      { type: "player", x: 100, y: 95, label: "S", role: "striker" },
      { type: "label", x: 100, y: 125, text: "Tired · still keep talking" },
    ],
  },

  cm4: {
    // GK-Led Organization Drill
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 40, y: 55, label: "D", role: "coach" },
      { type: "player", x: 80, y: 55, label: "D", role: "coach" },
      { type: "player", x: 120, y: 55, label: "D", role: "coach" },
      { type: "player", x: 160, y: 55, label: "D", role: "coach" },
      { type: "player", x: 100, y: 100, label: "S", role: "striker" },
      { type: "ball", x: 100, y: 97 },
      { type: "label", x: 100, y: 125, text: "Organize the back line" },
    ],
  },

  cm5: {
    // Switchplay Recovery Calls
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 50, y: 65, label: "D", role: "coach" },
      { type: "player", x: 150, y: 65, label: "D", role: "coach" },
      { type: "ball", x: 40, y: 90 },
      { type: "arrow", from: [40, 90], to: [160, 85], kind: "pass" },
      { type: "label", x: 100, y: 125, text: "Ball switches · re-organize" },
    ],
  },

  // ── Physical ──────────────────────────────────────────────────

  ph1: {
    // GK Plyometric Circuit
    elements: [
      { type: "cone", x: 70, y: 40 },
      { type: "cone", x: 100, y: 40 },
      { type: "cone", x: 130, y: 40 },
      { type: "cone", x: 70, y: 70 },
      { type: "cone", x: 100, y: 70 },
      { type: "cone", x: 130, y: 70 },
      { type: "keeper", x: 70, y: 40, label: "GK" },
      { type: "arrow", from: [70, 40], to: [130, 70], kind: "move" },
      { type: "label", x: 100, y: 95, text: "Plyo circuit" },
    ],
  },

  ph2: {
    // Box Jump + Dive Save
    elements: [
      { type: "cone", x: 100, y: 40 },
      { type: "keeper", x: 100, y: 40, label: "GK" },
      { type: "player", x: 100, y: 70, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 67 },
      { type: "arrow", from: [100, 70], to: [75, 30], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Jump then immediate save" },
    ],
  },

  ph3: {
    // Sprint Recovery Sequences
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "cone", x: 100, y: 95 },
      { type: "arrow", from: [100, 25], to: [100, 95], kind: "move" },
      { type: "arrow", from: [100, 95], to: [100, 25], kind: "move" },
      { type: "label", x: 100, y: 120, text: "Sprint · recover · repeat" },
    ],
  },

  ph4: {
    // Lateral Sprint + Collapse Dive
    elements: [
      { type: "keeper", x: 70, y: 30, label: "GK" },
      { type: "cone", x: 130, y: 30 },
      { type: "arrow", from: [70, 30], to: [130, 30], kind: "move" },
      { type: "player", x: 130, y: 60, label: "C", role: "coach" },
      { type: "ball", x: 130, y: 57 },
      { type: "arrow", from: [130, 60], to: [145, 35], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Sprint wide · dive late" },
    ],
  },

  ph5: {
    // Plyometric Jump + Cross Claim
    elements: [
      { type: "cone", x: 100, y: 40 },
      { type: "keeper", x: 100, y: 40, label: "GK" },
      { type: "player", x: 22, y: 70, label: "C", role: "coach" },
      { type: "ball", x: 22, y: 72 },
      { type: "arrow", from: [22, 70], to: [100, 30], kind: "cross" },
      { type: "label", x: 100, y: 125, text: "Jump · rise · claim high" },
    ],
  },

  // ── Mental ─────────────────────────────────────────────────

  mn1: {
    // Goal Visualization Exercise
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "label", x: 100, y: 70, text: "Quiet mind" },
      { type: "label", x: 100, y: 85, text: "See the save" },
    ],
  },

  mn2: {
    // Noise + Distraction Saves
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "cone", x: 50, y: 50 },
      { type: "cone", x: 150, y: 50 },
      { type: "cone", x: 60, y: 90 },
      { type: "cone", x: 140, y: 90 },
      { type: "player", x: 100, y: 70, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 67 },
      { type: "arrow", from: [100, 70], to: [95, 22], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Chaos around · focus in" },
    ],
  },

  mn3: {
    // Game State: Winning by 1
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 100, y: 80, label: "S", role: "striker" },
      { type: "ball", x: 100, y: 77 },
      { type: "arrow", from: [100, 80], to: [90, 20], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "89' · 1-0 up · stay calm" },
    ],
  },

  mn4: {
    // Game State: Losing by 1
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "player", x: 70, y: 80, label: "S", role: "striker" },
      { type: "player", x: 100, y: 90, label: "S", role: "striker" },
      { type: "player", x: 130, y: 80, label: "S", role: "striker" },
      { type: "ball", x: 100, y: 87 },
      { type: "arrow", from: [100, 90], to: [100, 20], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "89' · 0-1 down · stay ready" },
    ],
  },

  mn5: {
    // Ice-Water Mentality Sim
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "label", x: 100, y: 70, text: "Slow heart rate" },
      { type: "label", x: 100, y: 85, text: "Ice cold focus" },
    ],
  },

  mn6: {
    // Season Stats Personal Review (abstract)
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "label", x: 100, y: 70, text: "Saves · goals · clean sheets" },
      { type: "label", x: 100, y: 85, text: "Own the numbers" },
    ],
  },

  // ── Recovery ──────────────────────────────────────────────────

  rc1: {
    // Dynamic Mobility + Activation
    elements: [
      { type: "keeper", x: 100, y: 40, label: "GK" },
      { type: "cone", x: 60, y: 40 },
      { type: "cone", x: 140, y: 40 },
      { type: "arrow", from: [100, 40], to: [60, 40], kind: "move" },
      { type: "arrow", from: [100, 40], to: [140, 40], kind: "move" },
      { type: "arrow", from: [100, 40], to: [100, 80], kind: "move" },
      { type: "label", x: 100, y: 105, text: "Dynamic warm-up" },
    ],
  },

  rc2: {
    // Light Technical Touches
    elements: [
      { type: "keeper", x: 100, y: 30, label: "GK" },
      { type: "player", x: 100, y: 55, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 52 },
      { type: "arrow", from: [100, 55], to: [100, 32], kind: "pass" },
      { type: "arrow", from: [100, 32], to: [100, 55], kind: "pass" },
      { type: "label", x: 100, y: 125, text: "Soft hands · relaxed" },
    ],
  },

  rc3: {
    // Match Debrief Discussion
    elements: [
      { type: "keeper", x: 85, y: 50, label: "GK" },
      { type: "player", x: 115, y: 50, label: "C", role: "coach" },
      { type: "label", x: 100, y: 85, text: "What went well" },
      { type: "label", x: 100, y: 100, text: "What to sharpen" },
    ],
  },

  rc4: {
    // Ball Mastery Free Play
    elements: [
      { type: "keeper", x: 100, y: 50, label: "GK" },
      { type: "ball", x: 100, y: 55 },
      { type: "arrow", from: [100, 55], to: [80, 40], kind: "pass" },
      { type: "arrow", from: [100, 55], to: [120, 40], kind: "pass" },
      { type: "arrow", from: [100, 55], to: [100, 30], kind: "pass" },
      { type: "label", x: 100, y: 85, text: "Free play · feel the ball" },
    ],
  },

  rc5: {
    // Pre-Match Warm-Up Routine (multi-zone)
    elements: [
      { type: "keeper", x: 100, y: 25, label: "GK" },
      { type: "cone", x: 60, y: 55 },
      { type: "cone", x: 100, y: 55 },
      { type: "cone", x: 140, y: 55 },
      { type: "player", x: 100, y: 85, label: "C", role: "coach" },
      { type: "ball", x: 100, y: 82 },
      { type: "arrow", from: [100, 85], to: [95, 22], kind: "shot" },
      { type: "label", x: 100, y: 125, text: "Mobility · handling · saves" },
    ],
  },

  rc6: {
    // Post-Session Cool Down
    elements: [
      { type: "keeper", x: 100, y: 40, label: "GK" },
      { type: "label", x: 100, y: 70, text: "Slow breathing" },
      { type: "label", x: 100, y: 85, text: "Stretch · reset" },
    ],
  },
};

export function hasDiagram(drillId) {
  return Object.prototype.hasOwnProperty.call(DRILL_DIAGRAMS, drillId);
}
