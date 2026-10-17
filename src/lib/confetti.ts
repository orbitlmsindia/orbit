// Lightweight zero-dependency celebration confetti particle burst
export function triggerConfetti(options?: { particleCount?: number; spread?: number; origin?: { x?: number; y?: number } }) {
    if (typeof window === "undefined") return;

    try {
        const count = options?.particleCount || 60;
        const originX = (options?.origin?.x ?? 0.5) * window.innerWidth;
        const originY = (options?.origin?.y ?? 0.6) * window.innerHeight;

        const colors = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

        const canvas = document.createElement("canvas");
        canvas.style.position = "fixed";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = "999999";
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            document.body.removeChild(canvas);
            return;
        }

        const particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            alpha: number;
            rotation: number;
            rotationSpeed: number;
        }> = [];

        for (let i = 0; i < count; i++) {
            const angle = (Math.random() * Math.PI) - (Math.PI / 2) + ((Math.random() - 0.5) * 1.5);
            const speed = 6 + Math.random() * 12;
            particles.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 5,
                size: 6 + Math.random() * 8,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        }

        let animationFrame: number;
        const startTime = Date.now();

        const render = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > 2000) {
                cancelAnimationFrame(animationFrame);
                if (canvas.parentNode) {
                    canvas.parentNode.removeChild(canvas);
                }
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.3; // gravity
                p.vx *= 0.98; // drag
                p.rotation += p.rotationSpeed;
                p.alpha = Math.max(0, 1 - (elapsed / 2000));

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            }

            animationFrame = requestAnimationFrame(render);
        };

        animationFrame = requestAnimationFrame(render);
    } catch (e) {
        // Safe fallback
    }
}
