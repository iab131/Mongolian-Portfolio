// Live horse pose, written by the Rider every frame. Read it per frame (minimap, audio, herd);
// it is not React state, so don't render from it.
export const riderPose = { x: 0, y: 0, z: 0, yaw: 0, speed: 0, gait: 0 };
