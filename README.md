# GravTube - YouTube Downloader

A premium, local YouTube video and playlist downloader built with React, Vite, Node.js, and yt-dlp.

## Features
- Download individual YouTube videos or entire playlists.
- Choose between MP4 (Video) or MP3 (Audio) formats.
- Specify a custom download path on your computer.
- Real-time download progress tracking with a beautiful glassmorphic UI.

## How to Install and Run (For Windows)

1. **Download the Code:**
   Click the green **Code** button at the top of this page and select **Download ZIP**. Extract the ZIP file to a folder on your computer.

2. **Prerequisites:**
   Make sure you have [Node.js](https://nodejs.org/) installed on your computer.

3. **First-Time Setup:**
   Open the extracted folder and double-click the **`Start_GravTube.bat`** file.
   - It will automatically install all the necessary dependencies (this may take a minute or two).
   - It will then start the servers and open the app in your default web browser at `http://localhost:5173`.

4. **Running Later (Hidden Mode):**
   Once you have run it for the first time and installed the dependencies, you can use **`GravTube.vbs`** in the future. 
   - Double-clicking this file will start the app completely in the background without showing any command prompt windows, and directly open your browser.

## Troubleshooting
- **Download Fails:** Make sure your custom download path is correct (e.g., `C:\Users\YourName\Downloads`). If left empty, it will save to the `backend/downloads` folder in the project directory.
- **Port In Use:** Ensure no other applications are using port 4000 or 5173 on your machine.
