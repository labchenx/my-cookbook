import { createServerApp } from './serverApp';

const app = createServerApp();
const port = 3001;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
