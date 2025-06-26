import '../css/style.css';

const MOCK_MODE = false;

async function upload() {
  const fileInput = document.querySelector('input[type="file"]');
  const uploadBtn = document.getElementById('uploadBtn');
  const file = fileInput.files[0];

  if (!file) {
    return alert('Please select a file');
  }

  uploadBtn.disabled = true;
  const originalText = uploadBtn.textContent;
  uploadBtn.textContent = 'Loading...';

  if (MOCK_MODE) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockData = {
        name: 'Ivan Ivanov',
        email: 'ivan@example.com',
        experience: '3 years',
        skills: ['Python', 'Django', 'REST'],
      };
      displayParsedCV(mockData);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = originalText;
    }
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('http://localhost:8000/parse-cv', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('File upload failed');
    }

    const data = await response.json();
    const pureJsonString = ((data["extracted_data"])["response"])
      .replace(/^```json\s*/, '')
      .replace(/\s*```$/, '');
    displayParsedCV(JSON.parse(pureJsonString));
  } catch (error) {
    console.error(error);
    alert('An error occurred while uploading the file');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = originalText;
  }
}

function displayParsedCV(data) {
  const infoBox = document.getElementById('info-cv');

  const skills = (data["skills"] || [])
    .map(skill => typeof skill === 'string' ? skill : skill.name || JSON.stringify(skill))
    .join(", ");

  const experience = (data["experience"] || [])
    .map(exp => typeof exp === 'string' ? exp : exp.position || exp.title || JSON.stringify(exp))
    .join(", ");

  infoBox.innerHTML = `
    <h2>${data.name || 'No name found'}</h2>
    <p>Email: ${data.email || 'null'}</p>
    <p>Experience: ${experience}</p>
    <p>Skills: ${skills}</p>
  `;
}

document.getElementById('uploadBtn').addEventListener('click', upload);
