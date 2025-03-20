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
    
    // 获取重置选手编号相关元素
    const resetPlayerModal = document.getElementById('reset-player-modal');
    const resetPlayerBtn = document.getElementById('reset-player');
    const confirmResetPlayerBtn = document.getElementById('confirm-reset-player');
    const closeModalBtn = document.querySelector('.close');
    const newPlayerNumberInput = document.getElementById('new-player-number');
    
    // 获取设置评委数量相关元素
    const judgeCountModal = document.getElementById('judge-count-modal');
    const setJudgeCountBtn = document.getElementById('set-judge-count');
    const confirmJudgeCountBtn = document.getElementById('confirm-judge-count');
    const closeJudgeModalBtn = document.querySelector('.close-judge-modal');
    const judgeCountInput = document.getElementById('judge-count-input');
    
    // 评委数量 - 改为变量以便动态修改
    let judgeCount = 6;
    
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
        
        // 更新评委数量
        if (state.judgeCount) {
            judgeCount = state.judgeCount;
            initJudgesPanel();
        }
        
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
    
    // 监听重置选手事件
    socket.on('resetPlayer', (data) => {
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
    
    // 监听评委数量更新事件
    socket.on('judgeCountUpdate', (data) => {
        judgeCount = data.judgeCount;
        initJudgesPanel();
    });
    
    // 计算得分按钮
    calculateBtn.addEventListener('click', function() {
        fetch('/api/calculate', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            }
        })
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
    
    // 打开重置选手编号模态框
    resetPlayerBtn.addEventListener('click', function() {
        resetPlayerModal.style.display = 'block';
    });

    // 关闭重置选手编号模态框
    closeModalBtn.addEventListener('click', function() {
        resetPlayerModal.style.display = 'none';
    });

    // 确认重置选手编号
    confirmResetPlayerBtn.addEventListener('click', function() {
        const newPlayerNumber = newPlayerNumberInput.value;
        
        fetch('/api/reset-player-number', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ playerNumber: newPlayerNumber })
        })
        .then(response => response.json())
        .then(data => {
            resetPlayerModal.style.display = 'none';
        })
        .catch(error => {
            console.error('重置选手编号出错:', error);
        });
    });
    
    // 打开评委数量模态框
    setJudgeCountBtn.addEventListener('click', function() {
        judgeCountInput.value = judgeCount;
        judgeCountModal.style.display = 'block';
    });

    // 关闭评委数量模态框
    closeJudgeModalBtn.addEventListener('click', function() {
        judgeCountModal.style.display = 'none';
    });

    // 确认设置评委数量
    confirmJudgeCountBtn.addEventListener('click', function() {
        const newJudgeCount = parseInt(judgeCountInput.value);
        
        if (newJudgeCount < 3 || newJudgeCount > 9) {
            alert('评委数量必须在3-9之间');
            return;
        }
        
        fetch('/api/set-judge-count', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ judgeCount: newJudgeCount })
        })
        .then(response => response.json())
        .then(data => {
            judgeCountModal.style.display = 'none';
        })
        .catch(error => {
            console.error('设置评委数量出错:', error);
        });
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === resetPlayerModal) {
            resetPlayerModal.style.display = 'none';
        }
        if (event.target === judgeCountModal) {
            judgeCountModal.style.display = 'none';
        }
    });
});