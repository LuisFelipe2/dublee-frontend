# Dublee Frontend

A React application for video dubbing. Upload a video, have its voice removed, record new audio, and download the dubbed video.

## Features

- Upload video files
- Automatic voice removal processing
- Record new audio synchronized with the video
- Download the final dubbed video
- Responsive UI with drag-and-drop upload

## Tech Stack

- React 18
- React Router DOM
- Vite
- Functional programming with hooks
- CSS for styling

## API Integration

The app integrates with a backend API defined in `openapi.yaml`. The API provides endpoints for:

- Video upload
- Voice removal status checking
- Audio recording and video rendering
- Video download

## Project Structure

```
src/
├── components/
│   ├── UploadPage.jsx      # Video upload component
│   └── RecordingPage.jsx   # Audio recording component
├── services/
│   └── api.js              # API service functions
├── App.jsx                 # Main app with routing
├── main.jsx                # App entry point
└── index.css               # Global styles
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Usage

1. On the upload page, select or drag a video file.
2. Click "Enviar Vídeo" to upload and start processing.
3. Once processing is complete, you'll be redirected to the recording page.
4. Play the video and record your voice in sync.
5. The dubbed video will be downloaded automatically.

## API Base URL

The app assumes the backend API is served from the same origin at `/api`. Update `API_BASE_URL` in `src/services/api.js` if needed.
