import { state } from '../core/state.ts';
import { showToast } from '../utils/utils.ts';
import { calculateOverallAccuracy, getXPForNextLevel } from '../core/stats.ts';

const THEMES: Record<string, string[]> = {
    purple: ['#6c5ce7', '#a29bfe'],
    blue:   ['#0984e3', '#74b9ff'],
    green:  ['#00b894', '#55efc4'],
    orange: ['#e17055', '#fab1a0'],
    pink:   ['#e84393', '#fd79a8']
};

export async function shareStats(themeOverride?: string) {
    showToast('🎨 Создаем изображение...');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        showToast('❌ Ошибка: Не удалось создать холст для изображения.');
        return;
    }
    const width = 1600;
    const height = 1200;
    
    canvas.width = width;
    canvas.height = height;

    const themeKey = themeOverride || state.themeColor || 'purple';
    const colors = THEMES[themeKey] || THEMES.purple;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TOPIK II Master Pro', 40, 70);
    ctx.shadowBlur = 0;

    ctx.font = '18px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(new Date().toLocaleDateString(), 42, 105);

    const centerX = 200;
    const centerY = 320;
    const radius = 110;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 15;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    const nextLevelXP = getXPForNextLevel(state.userStats.level);
    const progress = Math.min(1, Math.max(0, state.userStats.xp / nextLevelXP));
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (progress * 2 * Math.PI);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 30;
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('LEVEL', centerX, centerY - 100);
    
    ctx.font = 'bold 160px sans-serif';
    ctx.fillText(String(state.userStats.level), centerX, centerY + 50);

    ctx.font = '32px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(`${state.userStats.xp} / ${nextLevelXP} XP`, centerX, centerY + 300);

    const stats = [
        { label: 'СЕРИЯ', value: state.streak.count, icon: '🔥' },
        { label: 'ИЗУЧЕНО', value: state.learned.size, icon: '📚' },
        { label: 'ТОЧНОСТЬ', value: calculateOverallAccuracy() + '%', icon: '🎯' },
        { label: 'МОНЕТЫ', value: state.userStats.coins, icon: '💰' },
        { label: 'СЕССИИ', value: state.sessions.length, icon: '⏱' },
        { label: 'РЕКОРД', value: state.userStats.sprintRecord || 0, icon: '⚡' }
    ];

    const gridStartX = 760;
    const gridStartY = 280;
    const cardW = 360;
    const cardH = 220;
    const gapX = 40;
    const gapY = 40;

    stats.forEach((stat, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = gridStartX + col * (cardW + gapX);
        const y = gridStartY + row * (cardH + gapY);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        roundRect(x, y, cardW, cardH, 32);
        ctx.fill();

        ctx.font = '64px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(stat.icon, x + 40, y + 90);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(stat.label, x + 130, y + 76);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 56px sans-serif';
        ctx.fillText(String(stat.value), x + 40, y + 170);
    });

    ctx.textAlign = 'center';
    ctx.font = '28px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('topik-master.app', width / 2, height - 40);

    try {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Blob creation failed');
        const file = new File([blob], 'topik_stats.png', { type: 'image/png' });
        let shared = false;

        const isWindows = navigator.userAgent.includes('Windows');

        if (!isWindows && navigator.share && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: 'Мой прогресс в TOPIK' });
                shared = true;
            } catch (e) {
                console.warn('Share API failed, falling back to download:', e);
            }
        }

        if (!shared) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'topik_stats.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('✅ Картинка сохранена');
        }
    } catch (e) {
        console.error(e); showToast('Ошибка экспорта');
    }
}