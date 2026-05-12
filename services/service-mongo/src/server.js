require('dotenv').config();

const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`service-mongo listening on port ${port}`);
});
