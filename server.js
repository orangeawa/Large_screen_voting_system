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
  try {
    const scores = Object.values(currentState.scores).map(score => parseFloat(score));
    
    if (scores.length < 1) {
      return res.status(400).json({ error: '至少需要1位评委打分才能计算！' });
    }
    
    let finalScore = 0;
    
    // 如果评委数量少于3，直接计算平均分
    if (scores.length < 3) {
      const sum = scores.reduce((acc, score) => acc + score, 0);
      finalScore = (sum / scores.length).toFixed(2);
      
      // 广播最终得分
      io.emit('finalScoreUpdate', { 
        finalScore: finalScore,
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores)
      });
    } else {
      // 找出最高分和最低分
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      
      // 计算去掉最高分和最低分后的平均分
      let sum = 0;
      let count = 0;
      let maxRemoved = false;
      let minRemoved = false;
      
      for (let i = 0; i < scores.length; i++) {
        const score = scores[i];
        
        // 跳过一个最高分和一个最低分
        if (score === maxScore && !maxRemoved) {
          maxRemoved = true;
          continue;
        }
        
        if (score === minScore && !minRemoved) {
          minRemoved = true;
          continue;
        }
        
        sum += score;
        count++;
      }
      
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
  } catch (error) {
    console.error('计算得分出错:', error);
    res.status(500).json({ error: '计算得分出错: ' + error.message });
  }
});

// 重置当前选手分数
app.post('/api/reset', (req, res) => {
  // 添加重置所有选手得分的功能
  if (req.body && req.body.resetAll) {
    currentState.allPlayerScores = {};
    currentState.currentPlayer = 1; // 重置为01号选手
    currentState.scores = {};
    currentState.finalScore = 0;
    
    // 广播重置
    io.emit('resetScores', { 
      resetAll: true,
      playerNumber: '01',
      playerTheme: currentState.playerTheme
    });
    
    res.json({ success: true });
  } else {
    // 只重置当前选手分数
    currentState.scores = {};
    currentState.finalScore = 0;
    
    // 广播重置
    io.emit('resetScores', { resetAll: false });
    res.json({ success: true });
  }
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

// 重置选手编号 - 修改为切换选手编号
app.post('/api/reset-player-number', (req, res) => {
  const { playerNumber } = req.body;
  const newPlayerNumber = parseInt(playerNumber) || 1;
  const formattedPlayerNumber = newPlayerNumber.toString().padStart(2, '0');
  
  // 保存当前选手的分数
  if (currentState.finalScore > 0) {
    const currentPlayerNumber = currentState.currentPlayer.toString().padStart(2, '0');
    currentState.allPlayerScores[currentPlayerNumber] = currentState.finalScore;
  }
  
  // 更新当前选手编号
  currentState.currentPlayer = newPlayerNumber;
  
  // 检查是否有该选手的历史得分
  const existingScore = currentState.allPlayerScores[formattedPlayerNumber];
  
  // 如果有历史得分，则恢复该选手的得分
  if (existingScore) {
    currentState.finalScore = existingScore;
    
    // 广播切换选手
    io.emit('switchPlayer', { 
      playerNumber: formattedPlayerNumber,
      playerTheme: currentState.playerTheme,
      finalScore: existingScore,
      hasScore: true
    });
  } else {
    // 如果没有历史得分，则重置分数
    currentState.scores = {};
    currentState.finalScore = 0;
    
    // 广播重置选手
    io.emit('resetPlayer', { 
      playerNumber: formattedPlayerNumber,
      playerTheme: currentState.playerTheme
    });
  }
  
  res.json({ 
    success: true,
    playerNumber: formattedPlayerNumber,
    playerTheme: currentState.playerTheme,
    finalScore: currentState.finalScore,
    hasScore: existingScore ? true : false
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
  
  // 广播评委数量更新 - 修改为发送更详细的信息
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