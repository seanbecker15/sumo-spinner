const express = require('express');
const app = express();
const port = 2000;

app.get('/', (req, res) => res.send('🍆💦🍑👅'));

app.listen(port, () => console.log(`🍆💦🍑 port ${port}`));