import React, { useEffect, useRef } from 'react';

export const GoldenFluidBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    // Smooth target for mouse position to create a "fluid/heavy" feel
    let targetMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.x = e.clientX;
      targetMouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Orbs simulating the "gold water"
    const orbs = [
      { radius: 400, color: 'rgba(212, 175, 55, 0.08)', x: 0, y: 0, vx: 1, vy: 0.8 },
      { radius: 600, color: 'rgba(212, 175, 55, 0.05)', x: 0, y: 0, vx: -0.5, vy: 1.2 },
      { radius: 300, color: 'rgba(252, 211, 77, 0.07)', x: 0, y: 0, vx: 0.8, vy: -1.1 } // Amberish #fcd34d
    ];
    
    // Initialize random positions
    orbs.forEach(orb => {
      orb.x = Math.random() * canvas.width;
      orb.y = Math.random() * canvas.height;
    });

    const render = () => {
      // Ease mouse
      mouse.x += (targetMouse.x - mouse.x) * 0.03;
      mouse.y += (targetMouse.y - mouse.y) * 0.03;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Base very dark bg is handled by CSS, we just draw the fluid lights
      
      // 1. Draw floating ambient orbs
      orbs.forEach((orb, i) => {
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Bounce
        if (orb.x < -orb.radius || orb.x > canvas.width + orb.radius) orb.vx *= -1;
        if (orb.y < -orb.radius || orb.y > canvas.height + orb.radius) orb.vy *= -1;

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw mouse interactive glow
      const mouseGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 500);
      mouseGrad.addColorStop(0, 'rgba(212, 175, 55, 0.12)'); // #d4af37
      mouseGrad.addColorStop(0.4, 'rgba(212, 175, 55, 0.03)');
      mouseGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = mouseGrad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 500, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 mix-blend-screen"
      style={{ filter: 'blur(40px)' }}
    />
  );
};
