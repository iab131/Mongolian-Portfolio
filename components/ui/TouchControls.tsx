"use client";

import { useEffect, useRef, useState } from "react";
import { gerById } from "@/content/gers";
import { setVirtualRide } from "@/lib/input";
import { useStore } from "@/lib/store";

const RADIUS = 46; // px the knob can travel from the centre
const DEADZONE = 0.14;

const shape = (v: number) => {
  const a = Math.abs(v);
  if (a < DEADZONE) return 0;
  return Math.sign(v) * Math.min(1, (a - DEADZONE) / (1 - DEADZONE));
};

/**
 * On-screen riding controls for touch devices: a stick (up = ride forward, left/right = turn)
 * and Gallop / Enter buttons. Writes the same intents as the keyboard via setVirtualRide.
 */
export function TouchControls() {
  const nearGerId = useStore((s) => s.nearGerId);
  const enterGer = useStore((s) => s.enterGer);
  const knob = useRef<HTMLSpanElement>(null);
  const stickId = useRef<number | null>(null);
  const gallopId = useRef<number | null>(null);
  const [stickActive, setStickActive] = useState(false);
  const [galloping, setGalloping] = useState(false);

  // Anything that could swallow a pointerup must release the controls.
  useEffect(() => {
    const release = () => {
      stickId.current = null;
      gallopId.current = null;
      setStickActive(false);
      setGalloping(false);
      if (knob.current) knob.current.style.transform = "";
      setVirtualRide({ throttle: 0, steer: 0, gallop: false });
    };
    const onVis = () => document.visibilityState !== "visible" && release();
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onVis);
      release();
    };
  }, []);

  const moveStick = (el: HTMLElement, clientX: number, clientY: number) => {
    const r = el.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx *= RADIUS / len;
      dy *= RADIUS / len;
    }
    if (knob.current) knob.current.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    // Up = forward; steer > 0 turns left, so dragging left gives a positive steer.
    setVirtualRide({ throttle: shape(-dy / RADIUS), steer: shape(-dx / RADIUS) });
  };

  const endStick = (e: React.PointerEvent) => {
    if (stickId.current !== e.pointerId) return;
    stickId.current = null;
    setStickActive(false);
    if (knob.current) knob.current.style.transform = "";
    setVirtualRide({ throttle: 0, steer: 0 });
  };

  const endGallop = (e: React.PointerEvent) => {
    if (gallopId.current !== e.pointerId) return;
    gallopId.current = null;
    setGalloping(false);
    setVirtualRide({ gallop: false });
  };

  return (
    <div className="touch-controls">
      <div
        className={`stick${stickActive ? " is-active" : ""}`}
        role="application"
        aria-label="Riding stick: drag up to ride, left or right to turn"
        onPointerDown={(e) => {
          if (stickId.current !== null) return;
          e.preventDefault();
          stickId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          setStickActive(true);
          moveStick(e.currentTarget, e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (stickId.current === e.pointerId) moveStick(e.currentTarget, e.clientX, e.clientY);
        }}
        onPointerUp={endStick}
        onPointerCancel={endStick}
        onLostPointerCapture={endStick}
      >
        <span className="stick-ring" aria-hidden />
        <span className="stick-knob" ref={knob} aria-hidden />
      </div>

      <div className="touch-actions">
        {nearGerId && (
          <button type="button" className="touch-btn touch-enter" onClick={() => enterGer(nearGerId)}>
            <span className="touch-btn-label">Enter</span>
            <span className="touch-btn-sub">{gerById[nearGerId].name}</span>
          </button>
        )}
        <button
          type="button"
          className={`touch-btn touch-gallop${galloping ? " is-active" : ""}`}
          aria-pressed={galloping}
          onPointerDown={(e) => {
            if (gallopId.current !== null) return;
            e.preventDefault();
            gallopId.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            setGalloping(true);
            setVirtualRide({ gallop: true });
          }}
          onPointerUp={endGallop}
          onPointerCancel={endGallop}
          onLostPointerCapture={endGallop}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg viewBox="0 0 24 24" aria-hidden width="22" height="22">
            <path d="M5 7l5 5-5 5M12 7l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
          </svg>
          <span className="touch-btn-label">Gallop</span>
        </button>
      </div>
    </div>
  );
}
