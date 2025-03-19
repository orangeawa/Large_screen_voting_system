document.addEventListener('DOMContentLoaded', function() {
    // 连接Socket.io
    const socket = io();
    
    // 获取DOM元素
    const playerNumberEl = document.getElementById('player-number');
    const playerThemeEl = document.getElementById('player-theme');
    const finalScoreEl = document.getElementById('final-score');
    const judgesPanelEl = document.querySelector('.judges-panel');
    const calculateBtn = document.getElementById('calculate');
    const resetBtn = document.getElementById('reset');
    const nextPlayerBtn = document.getElementById('next-player');
    
    // 评委数量
    const judgeCount = 6;
    
    // 初始化评委面板
    function initJudgesPanel() {
        judgesPanelEl.innerHTML = '';
        
        for (let i = 1; i <= judgeCount; i++) {
            const judgeDiv = document.createElement('div');
            judgeDiv.className = 'judge';
            judgeDiv.id = `judge${i}`;
            
            judgeDiv.innerHTML = `
                <h3>${i}号评委</h3>
                <div class="score">0.00</div>
            `;
            
            judgesPanelEl.appendChild(judgeDiv);
        }
    }
    
    // 初始化
    initJudgesPanel();
    
    // 初始状态
    socket.on('initialState', (state) => {
        playerNumberEl.textContent = state.currentPlayer.toString().padStart(2, '0') + '号选手';
        playerThemeEl.textContent = state.playerTheme;
        finalScoreEl.textContent = state.finalScore;
        
        // 显示已有的评分
        Object.entries(state.scores).forEach(([judgeId, score]) => {
            const judgeEl = document.getElementById(`judge${judgeId}`);
            if (judgeEl) {
                judgeEl.querySelector('.score').textContent = parseFloat(score).toFixed(2);
            }
        });
    });
    
    // 监听评分更新
    socket.on('scoreUpdate', (data) => {
        const judgeEl = document.getElementById(`judge${data.judgeId}`);
        if (judgeEl) {
            judgeEl.querySelector('.score').textContent = parseFloat(data.score).toFixed(2);
            // 移除之前的高亮
            judgeEl.classList.remove('highest', 'lowest');
        }
    });
    
    // 监听最终得分更新
    socket.on('finalScoreUpdate', (data) => {
        finalScoreEl.textContent = data.finalScore;
        
        // 高亮最高分和最低分
        document.querySelectorAll('.judge').forEach(judge => {
            judge.classList.remove('highest', 'lowest');
            const scoreText = judge.querySelector('.score').textContent;
            const score = parseFloat(scoreText);
            
            if (score === data.highestScore) {
                judge.classList.add('highest');
            } else if (score === data.lowestScore) {
                judge.classList.add('lowest');
            }
        });
    });
    
    // 监听分数重置事件
    socket.on('resetScores', () => {
        document.querySelectorAll('.judge .score').forEach(scoreEl => {
            scoreEl.textContent = '0.00';
        });
        
        document.querySelectorAll('.judge').forEach(judge => {
            judge.classList.remove('highest', 'lowest');
        });
        
        finalScoreEl.textContent = '0.00';
    });
    
    // 监听下一位选手事件
    socket.on('nextPlayer', (data) => {
        playerNumberEl.textContent = data.playerNumber + '号选手';
        playerThemeEl.textContent = data.playerTheme;
        
        document.querySelectorAll('.judge .score').forEach(scoreEl => {
            scoreEl.textContent = '0.00';
        });
        
        document.querySelectorAll('.judge').forEach(judge => {
            judge.classList.remove('highest', 'lowest');
        });
        
        finalScoreEl.textContent = '0.00';
    });
    
    // 计算得分按钮
    calculateBtn.addEventListener('click', function() {
        fetch('/api/calculate', {
            method: 'POST'
        })
        .then(response => response.json())
        .catch(error => {
            console.error('计算得分出错:', error);
        });
    });
    
    // 重置按钮
    resetBtn.addEventListener('click', function() {
        fetch('/api/reset', {
            method: 'POST'
        })
        .then(response => response.json())
        .catch(error => {
            console.error('重置分数出错:', error);
        });
    });
    
    // 下一位选手按钮
    nextPlayerBtn.addEventListener('click', function() {
        fetch('/api/next-player', {
            method: 'POST'
        })
        .then(response => response.json())
        .catch(error => {
            console.error('切换选手出错:', error);
        });
    });
});