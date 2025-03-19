document.addEventListener('DOMContentLoaded', function() {
    // 连接Socket.io
    const socket = io();
    
    // 获取DOM元素
    const playerNumberEl = document.getElementById('player-number');
    const playerThemeEl = document.getElementById('player-theme');
    const judgeIdEl = document.getElementById('judge-id');
    const scoreInput = document.getElementById('score');
    const submitBtn = document.getElementById('submit-score');
    const statusMessageEl = document.getElementById('status-message');
    
    // 从URL获取评委ID
    const urlParams = new URLSearchParams(window.location.search);
    const judgeId = urlParams.get('id');
    
    if (!judgeId) {
        alert('请提供评委ID！例如：?id=1');
        statusMessageEl.textContent = '未提供评委ID';
        submitBtn.disabled = true;
    } else {
        judgeIdEl.textContent = judgeId + '号评委';
    }
    
    // 初始状态
    socket.on('initialState', (state) => {
        playerNumberEl.textContent = state.currentPlayer.toString().padStart(2, '0') + '号选手';
        playerThemeEl.textContent = state.playerTheme;
        
        // 如果已经有该评委的分数，则显示
        if (state.scores[judgeId]) {
            scoreInput.value = state.scores[judgeId];
            statusMessageEl.textContent = '已提交评分';
            submitBtn.disabled = true;
        }
    });
    
    // 提交评分
    submitBtn.addEventListener('click', function() {
        const score = parseFloat(scoreInput.value);
        
        if (isNaN(score) || score < 0 || score > 100) {
            alert('请输入0-100之间的有效分数！');
            return;
        }
        
        // 发送评分到服务器
        fetch('/api/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ judgeId, score })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                statusMessageEl.textContent = '评分已提交';
                submitBtn.disabled = true;
            }
        })
        .catch(error => {
            console.error('提交评分出错:', error);
            statusMessageEl.textContent = '提交失败，请重试';
        });
    });
    
    // 监听分数重置事件
    socket.on('resetScores', () => {
        scoreInput.value = '';
        statusMessageEl.textContent = '分数已重置，请重新评分';
        submitBtn.disabled = false;
    });
    
    // 监听下一位选手事件
    socket.on('nextPlayer', (data) => {
        playerNumberEl.textContent = data.playerNumber + '号选手';
        playerThemeEl.textContent = data.playerTheme;
        scoreInput.value = '';
        statusMessageEl.textContent = '新选手，请评分';
        submitBtn.disabled = false;
    });
});