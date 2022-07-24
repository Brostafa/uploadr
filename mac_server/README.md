# Mac Server

Run `comm-sock.js` on your Macbook. This will create a server that listens for connections on `/tmp/video_upload.sock`. It utilizes IPC connections so you can send traffic to it like This

```bash
# Convert video.mov -> video.mp4
echo -e "{\"action\": \"convert\", \"inputPath\": \"video.mov\"}" | nc -U /tmp/upload_vid.socks

# Upload video.mp4 to backend
echo -e "{\"action\": \"upload\", \"inputPath\": \"video.mp4\"}" | nc -U /tmp/upload_vid.socks
```