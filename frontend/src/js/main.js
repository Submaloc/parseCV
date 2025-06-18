import '../css/style.css'


async function upload () {
    const fileInput = document.querySelector('input[type="file"]');
    const file = fileInput.files[0];

    if (!file) {
        return alert('Please select a file')
    }
}
document.getElementById('uploadBtn').addEventListener('click', upload);
