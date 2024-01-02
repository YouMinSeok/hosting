const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// public 폴더를 정적 파일 제공 경로로 설정
app.use(express.static(path.join(__dirname, 'public')));

// 모든 요청에 대해 public/index.html 제공
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
