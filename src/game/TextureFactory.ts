import Phaser from 'phaser';

export class TextureFactory {
    public static readonly SIZE = 30;

    public static create(scene: Phaser.Scene): void {
        const S = TextureFactory.SIZE;
        const pad = 3;
        const inner = S - pad * 2;
        const half = S / 2;

        // fg_0 (I – cyan): filled circle
        TextureFactory.gen(scene, 'fg_0', S, (g) => {
            g.fillStyle(0x00d4d4, 1);
            g.fillCircle(half, half, inner / 2);
            g.lineStyle(1.5, 0x80ffff, 0.8);
            g.strokeCircle(half, half, inner / 2);
        });

        // fg_1 (O – yellow): diamond
        TextureFactory.gen(scene, 'fg_1', S, (g) => {
            g.fillStyle(0xfcd303, 1);
            g.beginPath();
            g.moveTo(half, pad);
            g.lineTo(S - pad, half);
            g.lineTo(half, S - pad);
            g.lineTo(pad, half);
            g.closePath();
            g.fillPath();
            g.lineStyle(1.5, 0xffe880, 0.8);
            g.beginPath();
            g.moveTo(half, pad);
            g.lineTo(S - pad, half);
            g.lineTo(half, S - pad);
            g.lineTo(pad, half);
            g.closePath();
            g.strokePath();
        });

        // fg_2 (T – purple): cross (+)
        TextureFactory.gen(scene, 'fg_2', S, (g) => {
            const armW = 8;
            g.fillStyle(0xcc00cc, 1);
            g.fillRect(half - armW / 2, pad, armW, inner);
            g.fillRect(pad, half - armW / 2, inner, armW);
            g.lineStyle(1, 0xff80ff, 0.6);
            g.strokeRect(half - armW / 2, pad, armW, inner);
            g.strokeRect(pad, half - armW / 2, inner, armW);
        });

        // fg_3 (S – green): triangle (pointing up)
        TextureFactory.gen(scene, 'fg_3', S, (g) => {
            g.fillStyle(0x00dd00, 1);
            g.fillTriangle(half, pad, S - pad, S - pad, pad, S - pad);
            g.lineStyle(1.5, 0x80ff80, 0.8);
            g.strokeTriangle(half, pad, S - pad, S - pad, pad, S - pad);
        });

        // fg_4 (Z – red): hexagon
        TextureFactory.gen(scene, 'fg_4', S, (g) => {
            const r = inner / 2;
            g.fillStyle(0xff2020, 1);
            g.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 - Math.PI / 6;
                const px = half + r * Math.cos(angle);
                const py = half + r * Math.sin(angle);
                if (i === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }
            g.closePath();
            g.fillPath();
            g.lineStyle(1.5, 0xff8888, 0.8);
            g.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 - Math.PI / 6;
                const px = half + r * Math.cos(angle);
                const py = half + r * Math.sin(angle);
                if (i === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }
            g.closePath();
            g.strokePath();
        });

        // fg_5 (J – blue): 4-pointed star
        TextureFactory.gen(scene, 'fg_5', S, (g) => {
            const outerR = inner / 2;
            const innerR = outerR * 0.42;
            g.fillStyle(0x3a3aff, 1);
            g.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4 - Math.PI / 2;
                const r = i % 2 === 0 ? outerR : innerR;
                const px = half + r * Math.cos(angle);
                const py = half + r * Math.sin(angle);
                if (i === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }
            g.closePath();
            g.fillPath();
            g.lineStyle(1.5, 0x8888ff, 0.8);
            g.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4 - Math.PI / 2;
                const r = i % 2 === 0 ? outerR : innerR;
                const px = half + r * Math.cos(angle);
                const py = half + r * Math.sin(angle);
                if (i === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }
            g.closePath();
            g.strokePath();
        });

        // fg_6 (L – orange): ring (thick circle outline)
        TextureFactory.gen(scene, 'fg_6', S, (g) => {
            const r = inner / 2 - 1;
            g.lineStyle(6, 0xff8800, 1);
            g.strokeCircle(half, half, r);
            g.lineStyle(1.5, 0xffcc80, 0.8);
            g.strokeCircle(half, half, r + 3);
        });
    }

    private static gen(
        scene: Phaser.Scene,
        key: string,
        size: number,
        draw: (g: Phaser.GameObjects.Graphics) => void
    ): void {
        const g = scene.add.graphics();
        draw(g);
        g.generateTexture(key, size, size);
        g.destroy();
    }
}
