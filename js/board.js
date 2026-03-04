/**
 * 中国象棋棋盘渲染 - Canvas
 */

class BoardRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // 布局参数
        this.padding = 40;
        this.cellSize = 64;

        // 颜色主题
        this.colors = {
            boardBg: '#F0D9A0',
            boardLine: '#4A3728',
            boardLineLight: '#7A6348',
            redPiece: '#C0392B',
            redPieceBg: '#FDEBD0',
            blackPiece: '#1A1A2E',
            blackPieceBg: '#E8E8E8',
            selectedGlow: '#FFD700',
            legalDot: 'rgba(46, 204, 113, 0.7)',
            lastMoveHighlight: 'rgba(52, 152, 219, 0.35)',
            checkFlash: 'rgba(231, 76, 60, 0.4)',
            hintHighlight: 'rgba(155, 89, 182, 0.5)',
            riverText: '#7A6348'
        };

        // 交互状态
        this.selectedPos = null;
        this.legalMoves = [];
        this.lastMove = null;
        this.checkPos = null;
        this.hintMove = null;
        this.flipped = false;

        // 动画帧
        this.animationFrame = 0;
        this._startAnimation();

        this.resize();
    }

    /**
     * 调整Canvas尺寸（填满容器，保持棋盘比例）
     */
    resize() {
        const container = this.canvas.parentElement;
        const idealWidth = this.cellSize * 8 + this.padding * 2;
        const idealHeight = this.cellSize * 9 + this.padding * 2;

        const availW = container ? container.clientWidth - 16 : idealWidth;
        const availH = container ? container.clientHeight - 16 : idealHeight;

        const scaleW = availW / idealWidth;
        const scaleH = availH / idealHeight;
        const scale = Math.min(scaleW, scaleH);

        this.scale = scale;
        this.canvas.width = Math.round(idealWidth * scale);
        this.canvas.height = Math.round(idealHeight * scale);
        this.canvas.style.width = this.canvas.width + 'px';
        this.canvas.style.height = this.canvas.height + 'px';
    }

    /**
     * 坐标转换: 棋盘位置 → Canvas像素
     */
    boardToPixel(row, col) {
        let r = row, c = col;
        if (this.flipped) {
            r = 9 - row;
            c = 8 - col;
        }
        return {
            x: (this.padding + c * this.cellSize) * this.scale,
            y: (this.padding + r * this.cellSize) * this.scale
        };
    }

    /**
     * 坐标转换: Canvas像素 → 棋盘位置
     */
    pixelToBoard(px, py) {
        let c = Math.round(px / this.scale - this.padding) / this.cellSize;
        let r = Math.round(py / this.scale - this.padding) / this.cellSize;
        c = Math.round(c);
        r = Math.round(r);
        if (this.flipped) {
            r = 9 - r;
            c = 8 - c;
        }
        if (r < 0 || r > 9 || c < 0 || c > 8) return null;
        return { row: r, col: c };
    }

    /**
     * 绘制完整棋盘
     */
    render(board) {
        const ctx = this.ctx;
        const s = this.scale;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 背景
        this._drawBackground(ctx, s);
        // 棋盘线
        this._drawGrid(ctx, s);
        // 高亮
        this._drawHighlights(ctx, s, board);
        // 棋子
        this._drawPieces(ctx, s, board);
        // 合法走位标记
        this._drawLegalMoves(ctx, s);
        // 提示走法
        this._drawHint(ctx, s);
    }

    _drawBackground(ctx, s) {
        // 棋盘背景 - 木纹效果
        const grad = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        grad.addColorStop(0, '#E8C878');
        grad.addColorStop(0.3, '#F0D9A0');
        grad.addColorStop(0.7, '#E8C878');
        grad.addColorStop(1, '#D4B060');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 棋盘内区域略深
        const innerX = (this.padding - 10) * s;
        const innerY = (this.padding - 10) * s;
        const innerW = (this.cellSize * 8 + 20) * s;
        const innerH = (this.cellSize * 9 + 20) * s;
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(innerX, innerY, innerW, innerH);
    }

    _drawGrid(ctx, s) {
        ctx.strokeStyle = this.colors.boardLine;
        ctx.lineWidth = 1.5 * s;

        const p = this.padding;
        const cs = this.cellSize;

        // 横线 (10条)
        for (let r = 0; r <= 9; r++) {
            ctx.beginPath();
            ctx.moveTo((p) * s, (p + r * cs) * s);
            ctx.lineTo((p + 8 * cs) * s, (p + r * cs) * s);
            ctx.stroke();
        }

        // 竖线 - 上半区
        for (let c = 0; c <= 8; c++) {
            ctx.beginPath();
            ctx.moveTo((p + c * cs) * s, p * s);
            if (c === 0 || c === 8) {
                ctx.lineTo((p + c * cs) * s, (p + 9 * cs) * s);
            } else {
                ctx.lineTo((p + c * cs) * s, (p + 4 * cs) * s);
            }
            ctx.stroke();
        }

        // 竖线 - 下半区
        for (let c = 0; c <= 8; c++) {
            if (c === 0 || c === 8) continue;
            ctx.beginPath();
            ctx.moveTo((p + c * cs) * s, (p + 5 * cs) * s);
            ctx.lineTo((p + c * cs) * s, (p + 9 * cs) * s);
            ctx.stroke();
        }

        // 九宫格斜线 - 上方
        ctx.beginPath();
        ctx.moveTo((p + 3 * cs) * s, (p + 0 * cs) * s);
        ctx.lineTo((p + 5 * cs) * s, (p + 2 * cs) * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo((p + 5 * cs) * s, (p + 0 * cs) * s);
        ctx.lineTo((p + 3 * cs) * s, (p + 2 * cs) * s);
        ctx.stroke();

        // 九宫格斜线 - 下方
        ctx.beginPath();
        ctx.moveTo((p + 3 * cs) * s, (p + 7 * cs) * s);
        ctx.lineTo((p + 5 * cs) * s, (p + 9 * cs) * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo((p + 5 * cs) * s, (p + 7 * cs) * s);
        ctx.lineTo((p + 3 * cs) * s, (p + 9 * cs) * s);
        ctx.stroke();

        // 花标记点
        this._drawStarPoints(ctx, s);

        // 楚河汉界
        this._drawRiver(ctx, s);

        // 外边框加粗
        ctx.strokeStyle = this.colors.boardLine;
        ctx.lineWidth = 3 * s;
        ctx.strokeRect(
            (p - 2) * s, (p - 2) * s,
            (8 * cs + 4) * s, (9 * cs + 4) * s
        );
    }

    _drawStarPoints(ctx, s) {
        const p = this.padding;
        const cs = this.cellSize;
        const points = [
            [2, 1], [2, 7], // 炮位
            [3, 0], [3, 2], [3, 4], [3, 6], [3, 8], // 兵卒位
            [6, 0], [6, 2], [6, 4], [6, 6], [6, 8],
            [7, 1], [7, 7]
        ];

        ctx.strokeStyle = this.colors.boardLine;
        ctx.lineWidth = 1.2 * s;
        const len = 6 * s;
        const gap = 3 * s;

        for (const [r, c] of points) {
            const x = (p + c * cs) * s;
            const y = (p + r * cs) * s;

            // 四个角的小线段
            const dirs = [];
            if (c > 0) { // 左上、左下
                dirs.push([-1, -1], [-1, 1]);
            }
            if (c < 8) { // 右上、右下
                dirs.push([1, -1], [1, 1]);
            }

            for (const [dx, dy] of dirs) {
                ctx.beginPath();
                ctx.moveTo(x + dx * gap, y + dy * gap);
                ctx.lineTo(x + dx * gap, y + dy * (gap + len));
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + dx * gap, y + dy * gap);
                ctx.lineTo(x + dx * (gap + len), y + dy * gap);
                ctx.stroke();
            }
        }
    }

    _drawRiver(ctx, s) {
        const p = this.padding;
        const cs = this.cellSize;
        const riverY = (p + 4.5 * cs) * s;

        ctx.save();
        ctx.font = `bold ${22 * s}px "Noto Serif SC", "KaiTi", "STKaiti", serif`;
        ctx.fillStyle = this.colors.riverText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const txt1 = this.flipped ? '漢界' : '楚河';
        const txt2 = this.flipped ? '楚河' : '漢界';

        ctx.fillText(txt1, (p + 1.5 * cs) * s, riverY);
        ctx.fillText(txt2, (p + 6.5 * cs) * s, riverY);
        ctx.restore();
    }

    _drawHighlights(ctx, s, board) {
        // 最后一步高亮
        if (this.lastMove) {
            this._highlightCell(ctx, s, this.lastMove.fr, this.lastMove.fc, this.colors.lastMoveHighlight);
            this._highlightCell(ctx, s, this.lastMove.tr, this.lastMove.tc, this.colors.lastMoveHighlight);
        }

        // 选中棋子高亮
        if (this.selectedPos) {
            this._highlightCell(ctx, s, this.selectedPos.row, this.selectedPos.col, this.colors.selectedGlow, true);
        }

        // 将军高亮
        if (this.checkPos) {
            const alpha = 0.3 + 0.2 * Math.sin(this.animationFrame * 0.1);
            this._highlightCell(ctx, s, this.checkPos.r, this.checkPos.c, `rgba(231, 76, 60, ${alpha})`);
        }
    }

    _highlightCell(ctx, s, row, col, color, isSelected = false) {
        const { x, y } = this.boardToPixel(row, col);
        const r = this.cellSize * 0.45 * s;

        if (isSelected) {
            // 选中 - 发光效果
            ctx.save();
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 15 * s;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
            ctx.fill();
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    _drawPieces(ctx, s, board) {
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] !== PIECE.EMPTY) {
                    this._drawPiece(ctx, s, r, c, board[r][c]);
                }
            }
        }
    }

    _drawPiece(ctx, s, row, col, piece) {
        const { x, y } = this.boardToPixel(row, col);
        const radius = this.cellSize * 0.42 * s;
        const side = getSide(piece);
        const isRed = side === RED;

        ctx.save();

        // 阴影
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4 * s;
        ctx.shadowOffsetY = 2 * s;

        // 棋子外圆
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        const pieceGrad = ctx.createRadialGradient(
            x - radius * 0.2, y - radius * 0.2, radius * 0.1,
            x, y, radius
        );
        if (isRed) {
            pieceGrad.addColorStop(0, '#FFF5E6');
            pieceGrad.addColorStop(0.5, '#FDEBD0');
            pieceGrad.addColorStop(1, '#E8D5B0');
        } else {
            pieceGrad.addColorStop(0, '#FFFFFF');
            pieceGrad.addColorStop(0.5, '#F0F0F0');
            pieceGrad.addColorStop(1, '#D5D5D5');
        }
        ctx.fillStyle = pieceGrad;
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 棋子边框
        ctx.lineWidth = 2 * s;
        ctx.strokeStyle = isRed ? '#8B4513' : '#333';
        ctx.stroke();

        // 内圈
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.82, 0, Math.PI * 2);
        ctx.lineWidth = 1.2 * s;
        ctx.strokeStyle = isRed ? this.colors.redPiece : this.colors.blackPiece;
        ctx.stroke();

        // 棋子文字
        const name = PIECE_NAMES[piece];
        ctx.font = `bold ${radius * 1.2}px "Noto Serif SC", "KaiTi", "STKaiti", "SimSun", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isRed ? this.colors.redPiece : this.colors.blackPiece;
        ctx.fillText(name, x, y + 1 * s);

        ctx.restore();
    }

    _drawLegalMoves(ctx, s) {
        for (const move of this.legalMoves) {
            const { x, y } = this.boardToPixel(move.tr, move.tc);
            ctx.beginPath();
            if (move.captured) {
                // 可吃子位 - 空心圆
                const r = this.cellSize * 0.42 * s;
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.lineWidth = 3 * s;
                ctx.strokeStyle = 'rgba(231, 76, 60, 0.6)';
                ctx.stroke();
            } else {
                // 可走位 - 实心小圆
                ctx.arc(x, y, 8 * s, 0, Math.PI * 2);
                ctx.fillStyle = this.colors.legalDot;
                ctx.fill();
            }
        }
    }

    _drawHint(ctx, s) {
        if (!this.hintMove) return;
        const alpha = 0.4 + 0.3 * Math.sin(this.animationFrame * 0.08);

        // 起始位
        const from = this.boardToPixel(this.hintMove.fr, this.hintMove.fc);
        ctx.save();
        ctx.shadowColor = 'rgba(155, 89, 182, 0.6)';
        ctx.shadowBlur = 12 * s;
        ctx.beginPath();
        ctx.arc(from.x, from.y, this.cellSize * 0.45 * s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(155, 89, 182, ${alpha * 0.4})`;
        ctx.fill();
        ctx.restore();

        // 目标位
        const to = this.boardToPixel(this.hintMove.tr, this.hintMove.tc);
        ctx.save();
        ctx.shadowColor = 'rgba(155, 89, 182, 0.6)';
        ctx.shadowBlur = 12 * s;
        ctx.beginPath();
        ctx.arc(to.x, to.y, this.cellSize * 0.45 * s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(155, 89, 182, ${alpha * 0.4})`;
        ctx.fill();
        ctx.restore();

        // 箭头
        this._drawArrow(ctx, s, from.x, from.y, to.x, to.y, `rgba(155, 89, 182, ${alpha})`);
    }

    _drawArrow(ctx, s, x1, y1, x2, y2, color) {
        const headLen = 15 * s;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const r = this.cellSize * 0.42 * s;

        // 缩短箭头使其不叠加在棋子上
        const dx = x2 - x1, dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const startFrac = r / dist;
        const endFrac = 1 - r / dist;

        const sx = x1 + dx * startFrac;
        const sy = y1 + dy * startFrac;
        const ex = x1 + dx * endFrac;
        const ey = y1 + dy * endFrac;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 3 * s;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    _startAnimation() {
        const animate = () => {
            this.animationFrame++;
            requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * 设置选中棋子和合法走法
     */
    setSelection(pos, legalMoves, board) {
        this.selectedPos = pos;
        this.legalMoves = legalMoves.map(m => ({
            ...m,
            captured: board[m.tr][m.tc] !== PIECE.EMPTY
        }));
    }

    clearSelection() {
        this.selectedPos = null;
        this.legalMoves = [];
    }

    setLastMove(move) {
        this.lastMove = move;
    }

    setCheckPos(pos) {
        this.checkPos = pos;
    }

    setHint(move) {
        this.hintMove = move;
    }

    clearHint() {
        this.hintMove = null;
    }
}
