document.addEventListener('DOMContentLoaded', function() {
    // 连接Socket.io
    const socket = io();
    
    // 获取DOM元素
    const scoresBodyEl = document.getElementById('scores-body');
    const exportScoresBtn = document.getElementById('export-scores');
    
    // 加载所有选手得分
    function loadAllScores() {
        fetch('/api/all-scores')
            .then(response => response.json())
            .then(scores => {
                scoresBodyEl.innerHTML = '';
                
                // 按选手编号排序
                const sortedScores = Object.entries(scores).sort((a, b) => {
                    return parseInt(a[0]) - parseInt(b[0]);
                });
                
                if (sortedScores.length === 0) {
                    const emptyRow = document.createElement('tr');
                    emptyRow.innerHTML = '<td colspan="2">暂无选手得分数据</td>';
                    scoresBodyEl.appendChild(emptyRow);
                    return;
                }
                
                sortedScores.forEach(([playerNumber, score]) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${playerNumber}号选手</td>
                        <td>${score}</td>
                    `;
                    scoresBodyEl.appendChild(row);
                });
            })
            .catch(error => {
                console.error('获取所有选手得分出错:', error);
            });
    }
    
    // 初始加载
    loadAllScores();
    
    // 监听最终得分更新，实时更新表格
    socket.on('finalScoreUpdate', () => {
        loadAllScores();
    });
    
    // 导出成绩
    exportScoresBtn.addEventListener('click', function() {
        fetch('/api/all-scores')
            .then(response => response.json())
            .then(scores => {
                // 按选手编号排序
                const sortedScores = Object.entries(scores).sort((a, b) => {
                    return parseInt(a[0]) - parseInt(b[0]);
                });
                
                if (sortedScores.length === 0) {
                    alert('暂无选手得分数据可导出');
                    return;
                }
                
                // 创建CSV内容
                let csvContent = '选手编号,最终得分\n';
                sortedScores.forEach(([playerNumber, score]) => {
                    csvContent += `${playerNumber}号选手,${score}\n`;
                });
                
                // 创建下载链接
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', '选手得分表.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch(error => {
                console.error('导出成绩出错:', error);
            });
    });
});