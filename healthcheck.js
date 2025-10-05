import http from 'http';

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/ready',
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
};

const request = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      // Verify status code is 200 AND database is connected
      if (res.statusCode === 200 && response.status === 'ready' && response.database === 'connected') {
        process.exit(0);
      } else {
        process.exit(1);
      }
    } catch (error) {
      // JSON parse error or invalid response
      process.exit(1);
    }
  });
});

request.on('error', () => {
  process.exit(1);
});

request.on('timeout', () => {
  request.destroy();
  process.exit(1);
});

request.end();
