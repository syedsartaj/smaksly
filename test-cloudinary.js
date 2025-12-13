const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: 'your_cloud_name',
  api_key: 'your_api_key',
  api_secret: 'your_api_secret',
});

cloudinary.api.ping((err, result) => {
  if (err) {
    console.error('❌ Cloudinary connection failed:', err.message);
  } else {
    console.log('✅ Cloudinary connection successful:', result);
  }
});
