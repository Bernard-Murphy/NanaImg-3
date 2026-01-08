export const normalize = {
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
};

export const fade_out = {
  opacity: 0,
  scale: 0.97,
};

export const fade_out_forward = {
  opacity: 0,
  scale: 1.1,
};

export const fade_out_scale_1 = {
  opacity: 0,
};

export const fade_out_up = {
  opacity: 0,
  y: -50,
};

export const fade_out_down = {
  opacity: 0,
  y: 50,
};

export const fade_out_right = {
  opacity: 0,
  x: 50,
};

export const fade_out_left = {
  opacity: 0,
  x: -50,
};

export const fade_out_top = {
  opacity: 0,
  scale: 0.98,
  y: 40,
};

export const fade_out_bottom = {
  opacity: 0,
  scale: 0.98,
  y: -40,
};

export const fade_out_minimize = {
  opacity: 0,
  scale: 0.5,
};

export const bob_left = {
  x: -20,
  opacity: 0.5,
};

export const bob_right = {
  x: 20,
  opacity: 0.5,
};

export const fade_out_left_minor = {
  opacity: 0,
  x: -300,
};

export const fade_out_right_minor = {
  opacity: 0,
  x: 300,
};

export const retract = {
  height: 0,
};

export const transition = {
  // x: { duration: 0.33 },
  // y: { duration: 0.33 },
  // opacity: { duration: 0.25 },
  // scale: { duration: 0.26 },
  x: { duration: 0.25 },
  y: { duration: 0.25 },
  opacity: { duration: 0.17 },
  scale: { duration: 0.18 },
  height: { duration: 0.18 },
  width: { duration: 0.18 },
};

export const transition_fast = {
  x: { duration: 0.19 },
  y: { duration: 0.19 },
  opacity: { duration: 0.11 },
  scale: { duration: 0.12 },
  height: { duration: 0.19 },
  width: { duration: 0.19 },
};

export const pageVariants = {
  initial: fade_out,
  animate: normalize,
  exit: fade_out_scale_1,
  transition: transition_fast,
};

// Staggered children animation
export const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};
