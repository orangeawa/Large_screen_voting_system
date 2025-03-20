const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 存储当前比赛状态
let currentState = {
  currentPlayer: 1,
  playerTheme: '自主命题讲解',
  scores: {},  // 格式: {judgeId: score}
  finalScore: 0,
  judgeCount: 6,  // 默认评委数量
  allPlayerScores: {}  // 格式: {playerNumber: finalScore}
};

// 提供静态文件
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API路由
app.get('/api/state', (req, res) => {
  res.json(currentState);
});

// 更新评分
app.post('/api/score', (req, res) => {
  const { judgeId, score } = req.body;
  currentState.scores[judgeId] = score;
  
  // 广播更新
  io.emit('scoreUpdate', { judgeId, score });
  res.json({ success: true });
});

// 计算最终得分
app.post('/api/calculate', (req, res) => {
  const scores = Object.values(currentState.scores);
  
  if (scores.length < 1) {
    return res.status(400).json({ error: '至少需要1位评委打分才能计算！' });
  }
  
  let finalScore = 0;
  
  // 如果评委数量少于3，直接计算平均分
  if (scores.length < 3) {
    const sum = scores.reduce((acc, score) => acc + parseFloat(score), 0);
    finalScore = (sum / scores.length).toFixed(2);
    
    // 广播最终得分
    io.emit('finalScoreUpdate', { 
      finalScore: finalScore,
      highestScore: null,
      lowestScore: null
    });
  } else {
    // 找出最高分和最低分
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    
    // 计算去掉最高分和最低分后的平均分
    let sum = 0;
    let count = 0;
    
    scores.forEach(score => {
      if (score !== maxScore && score !== minScore) {
        sum += parseFloat(score);
        count++;
      }
    });
    
    finalScore = count > 0 ? (sum / count).toFixed(2) : "0.00";
    
    // 广播最终得分
    io.emit('finalScoreUpdate', { 
      finalScore: finalScore,
      highestScore: maxScore,
      lowestScore: minScore
    });
  }
  
  currentState.finalScore = finalScore;
  
  // 保存当前选手的最终得分
  const playerNumber = currentState.currentPlayer.toString().padStart(2, '0');
  currentState.allPlayerScores[playerNumber] = currentState.finalScore;
  
  res.json({ finalScore: currentState.finalScore });
});

// 重置当前选手分数
app.post('/api/reset', (req, res) => {
  currentState.scores = {};
  currentState.finalScore = 0;
  
  // 添加重置所有选手得分的功能
  if (req.body && req.body.resetAll) {
    currentState.allPlayerScores = {};
  }
  
  // 广播重置
  io.emit('resetScores', { resetAll: req.body && req.body.resetAll });
  res.json({ success: true });
});

// 下一位选手
app.post('/api/next-player', (req, res) => {
  currentState.currentPlayer++;
  currentState.scores = {};
  currentState.finalScore = 0;
  
  // 广播下一位选手
  io.emit('nextPlayer', { 
    playerNumber: currentState.currentPlayer.toString().padStart(2, '0'),
    playerTheme: currentState.playerTheme
  });
  
  res.json({ success: true });
});

// 重置选手编号
app.post('/api/reset-player-number', (req, res) => {
  const { playerNumber } = req.body;
  currentState.currentPlayer = parseInt(playerNumber) || 1;
  currentState.scores = {};
  currentState.finalScore = 0;
  
  const formattedPlayerNumber = currentState.currentPlayer.toString().padStart(2, '0');
  
  // 广播重置选手
  io.emit('resetPlayer', { 
    playerNumber: formattedPlayerNumber,
    playerTheme: currentState.playerTheme
  });
  
  res.json({ 
    success: true,
    playerNumber: formattedPlayerNumber,
    playerTheme: currentState.playerTheme
  });
});

// 设置评委数量
app.post('/api/set-judge-count', (req, res) => {
  const { judgeCount } = req.body;
  currentState.judgeCount = parseInt(judgeCount) || 6;
  
  // 清理超出评委数量的分数
  Object.keys(currentState.scores).forEach(judgeId => {
    if (parseInt(judgeId) > currentState.judgeCount) {
      delete currentState.scores[judgeId];
    }
  });
  
  // 广播评委数量更新
  io.emit('judgeCountUpdate', { judgeCount: currentState.judgeCount });
  res.json({ success: true });
});

// 获取所有选手得分
app.get('/api/all-scores', (req, res) => {
  res.json(currentState.allPlayerScores);
});

// Socket.io连接处理
io.on('connection', (socket) => {
  console.log('用户已连接');
  
  // 发送当前状态给新连接的客户端
  socket.emit('initialState', currentState);
  
  socket.on('disconnect', () => {
    console.log('用户已断开连接');
  });
});

// 启动服务器
const PORT = process.env.PORT || 2999;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});