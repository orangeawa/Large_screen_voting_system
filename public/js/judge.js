document.addEventListener('DOMContentLoaded', function() {
    // 获取URL参数中的评委ID
    const urlParams = new URLSearchParams(window.location.search);
    const judgeId = urlParams.get('id');
    
    // 获取DOM元素
    const judgeIdEl = document.getElementById('judge-id');
    const playerNumberEl = document.getElementById('player-number');
    const playerThemeEl = document.getElementById('player-theme');
    const scoreInput = document.getElementById('score');
    const submitScoreBtn = document.getElementById('submit-score');
    const statusMessageEl = document.getElementById('status-message');
    
    // 连接Socket.io
    const socket = io();
    
    // 如果没有评委ID，显示错误
    if (!judgeId) {
        judgeIdEl.textContent = '错误：未指定评委ID';
        submitScoreBtn.disabled = true;
        return;
    }
    
    // 显示评委ID
    judgeIdEl.textContent = judgeId + '号评委';
    
    // 获取初始状态
    socket.on('initialState', (state) => {
        playerNumberEl.textContent = state.currentPlayer.toString().padStart(2, '0') + '号选手';
        playerThemeEl.textContent = state.playerTheme;
        
        // 检查是否已经为当前选手打过分
        if (state.scores[judgeId]) {
            scoreInput.value = state.scores[judgeId];
            statusMessageEl.textContent = '已提交评分';
            submitScoreBtn.disabled = true;
        } else {
            scoreInput.value = '';
            statusMessageEl.textContent = '等待打分';
            submitScoreBtn.disabled = false;
        }
    });
    
    // 监听下一位选手事件
    socket.on('nextPlayer', (data) => {
        playerNumberEl.textContent = data.playerNumber + '号选手';
        playerThemeEl.textContent = data.playerTheme;
        
        // 清空评分输入框
        scoreInput.value = '';
        statusMessageEl.textContent = '等待打分';
        submitScoreBtn.disabled = false;
    });
    
    // 监听重置选手编号事件
    socket.on('resetPlayer', (data) => {
        playerNumberEl.textContent = data.playerNumber + '号选手';
        playerThemeEl.textContent = data.playerTheme;
        
        // 清空评分输入框
        scoreInput.value = '';
        statusMessageEl.textContent = '等待打分';
        submitScoreBtn.disabled = false;
    });
    
    // 监听切换选手事件
    socket.on('switchPlayer', (data) => {
        playerNumberEl.textContent = data.playerNumber + '号选手';
        playerThemeEl.textContent = data.playerTheme;
        
        // 检查当前评委是否已经为该选手打过分
        fetch('/api/state')
            .then(response => response.json())
            .then(state => {
                if (state.scores[judgeId]) {
                    scoreInput.value = state.scores[judgeId];
                    statusMessageEl.textContent = '已提交评分';
                    submitScoreBtn.disabled = true;
                } else {
                    scoreInput.value = '';
                    statusMessageEl.textContent = '等待打分';
                    submitScoreBtn.disabled = false;
                }
            });
    });
    
    // 监听分数重置事件
    socket.on('resetScores', (data) => {
        // 清空评分输入框
        scoreInput.value = '';
        statusMessageEl.textContent = '等待打分';
        submitScoreBtn.disabled = false;
        
        // 如果是重置所有选手得分，则更新选手编号
        if (data && data.resetAll) {
            playerNumberEl.textContent = data.playerNumber + '号选手';
            playerThemeEl.textContent = data.playerTheme;
        }
    });
    
    // 提交评分
    submitScoreBtn.addEventListener('click', function() {
        const score = parseFloat(scoreInput.value);
        
        if (isNaN(score) || score < 0 || score > 100) {
            alert('请输入0-100之间的有效分数！');
            return;
        }
        
        fetch('/api/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ judgeId, score })
        })
        .then(response => response.json())
        .then(data => {
            statusMessageEl.textContent = '已提交评分';
            submitScoreBtn.disabled = true;
        })
        .catch(error => {
            console.error('提交评分出错:', error);
            statusMessageEl.textContent = '提交失败，请重试';
        });
    });
});