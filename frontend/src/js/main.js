import '../css/style.css';

const MOCK_MODE = true;

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
    const response = await fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('File upload failed');
    }

    const data = await response.json();
    displayParsedCV(data);
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
  infoBox.innerHTML = `
    <h2>${data.name}</h2>
    <p>Email: ${data.email}</p>
    <p>Experience: ${data.experience}</p>
    <p>Skills: ${data.skills.join(', ')}</p>
  `;
}

document.getElementById('uploadBtn').addEventListener('click', upload);
