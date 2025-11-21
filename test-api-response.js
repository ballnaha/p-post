// Test API response
fetch('http://localhost:3000/api/dashboard?year=2568&unit=all')
  .then(res => res.json())
  .then(data => {
    const person = data.data.supportedPersonnel.find(p => p.fullName?.includes('อภิสัณห์'));
    console.log('Person data:', JSON.stringify(person, null, 2));
  })
  .catch(err => console.error('Error:', err));
