document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileSelect = document.getElementById('file-select');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    const previewSection = document.getElementById('preview-section');
    const previewImage = document.getElementById('preview-image');
    const loadingSpinner = document.getElementById('loading-spinner');
    const resultsSection = document.getElementById('results-section');
    const imageDescription = document.getElementById('image-description');
    const captionsContainer = document.getElementById('captions-container');
    const regenerateButton = document.getElementById('regenerate');
    const startOverButton = document.getElementById('start-over');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#e8f4fc';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.backgroundColor = '#F8F9FA';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#F8F9FA';
        handleFile(e.dataTransfer.files[0]);
    });

    fileSelect.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });

    function handleFile(file) {
        if (file && file.type.startsWith('image/')) {
            if (file.size > 10 * 1024 * 1024) {
                alert('File is too large. Please select an image smaller than 10MB.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewSection.style.display = 'block';
                loadingSpinner.style.display = 'block';
                uploadFile(file);
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select a valid image file.');
        }
    }

async function uploadFile(file) {
  const formData = new FormData();
  formData.append('image', file);

  try {
    console.log('Uploading file...');
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    console.log('Response status:', response.status);
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const result = await response.json();
      if (!response.ok) {
        console.error('Server error:', result);
        throw new Error(result.error || 'An error occurred during upload');
      }
      console.log('Upload successful:', result);
      displayResults(result);
    } else {
      const text = await response.text();
      console.error('Unexpected response:', text);
      throw new Error('Server returned an unexpected response');
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert(`Upload failed: ${error.message}`);
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

    function displayResults(result) {
        console.log('Result received:', result);
    
        if (!result || typeof result !== 'object') {
            console.error('Invalid result received:', result);
            alert('An error occurred while processing the image.');
            return;
        }
    
        imageDescription.textContent = result.imageDescription || 'No description available';
        captionsContainer.innerHTML = '';
    
        if (Array.isArray(result.captions)) {
            result.captions.forEach(caption => {
                const captionCard = document.createElement('div');
                captionCard.classList.add('caption-card');
                captionCard.textContent = caption;
                captionsContainer.appendChild(captionCard);
            });
        } else {
            console.error('Captions are not in the expected format:', result.captions);
            captionsContainer.textContent = 'No captions available';
        }
    
        resultsSection.style.display = 'block';
    }

    regenerateButton.addEventListener('click', () => {
        if (fileInput.files.length > 0) {
            loadingSpinner.style.display = 'block';
            uploadFile(fileInput.files[0]);
        } else {
            alert('Please upload an image first.');
        }
    });

    startOverButton.addEventListener('click', () => {
        previewSection.style.display = 'none';
        resultsSection.style.display = 'none';
        fileInput.value = '';
        dropZone.style.backgroundColor = '#F8F9FA';
    });
});
