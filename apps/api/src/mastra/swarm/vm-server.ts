import express from 'express';
import router from './router';

const app = express();
app.use(express.json());
app.use('/', router);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Golden Image VM server running on port ${PORT}`);
});