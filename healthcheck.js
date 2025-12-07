import http from 'http';

const options = {
  host: 'localhost',
  port: process.env.PORT || 4000,
  path: '/ready',
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
  headers: {
    'User-Agent': 'Docker-Healthcheck',
  },
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
      if (
        res.statusCode === 200 &&
        response.status === 'ready' &&
        response.database === 'connected'
      ) {
        // Success - application is healthy
        process.exit(0);
      } else {
        // Application responded but is not ready
        console.error(
          `Health check failed: Status ${res.statusCode}, Body: ${JSON.stringify(response)}`,
        );
        process.exit(1);
      }
    } catch (error) {
      // JSON parse error or invalid response
      console.error(
        `Health check failed: Unable to parse response. Status ${res.statusCode}, Data: ${data}`,
      );
      process.exit(1);
    }
  });
});

request.on('error', (error) => {
  console.error(`Health check failed: ${error.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  console.error(
    `Health check failed: Timeout after ${options.timeout}ms`,
  );
  request.destroy();
  process.exit(1);
});

request.end();
