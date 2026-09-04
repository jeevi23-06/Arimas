const express = require('express');
const app = express();
app.get('*all', (req, res) => {
  res.send('caught');
});
app.listen(3001, () => {
  console.log('Listening');
});
