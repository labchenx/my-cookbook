import express from 'express';
import './db/init';

const app = express();
const port = 3001;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
