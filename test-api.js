// Test API response
// เปิด DevTools > Console แล้วรันคำสั่งนี้

fetch('/api/new-in-out?year=2568&page=0&pageSize=10')
  .then(res => res.json())
  .then(data => {
    console.log('API Response:', data);
    console.log('First personnel:', data.data[0]);
    console.log('Has avatarUrl?', data.data[0]?.avatarUrl);
  });
