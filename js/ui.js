import { COLORS } from './constants.js';

export class UIHelper {
    static drawRoundedRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    static drawPanel(ctx, x, y, width, height, radius = 18) {
        ctx.save();

        ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;

        ctx.fillStyle = COLORS.PANEL;
        this.drawRoundedRect(ctx, x, y, width, height, radius, true, false);

        ctx.shadowBlur = 0;
        ctx.strokeStyle = COLORS.PANEL_BORDER;
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, x, y, width, height, radius, false, true);

        ctx.restore();
    }

    static fillCanvas(ctx, width, height, color = COLORS.BG) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
    }

    static drawTrackedText(ctx, text, x, y, tracking = 0) {
        const chars = Array.from(text);
        if (chars.length === 0) return 0;

        let totalWidth = 0;
        for (let i = 0; i < chars.length; i++) {
            totalWidth += ctx.measureText(chars[i]).width;
            if (i !== chars.length - 1) totalWidth += tracking;
        }

        let cursorX = x - totalWidth / 2;
        for (let i = 0; i < chars.length; i++) {
            const w = ctx.measureText(chars[i]).width;
            ctx.fillText(chars[i], cursorX + w / 2, y);
            cursorX += w + tracking;
        }

        return totalWidth;
    }
}
