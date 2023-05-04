# Video Ops

### [App flow video](https://video-ops.vercel.app/video/MDg5YzRiMT)

This is an app for uploading videos, processing them into 480p, 720p, and 1080p. Once uploaded, you can watch them in a custom-made player and embed them into another website as iframe.

-   To set up CORS in <b>GCP CLI</b>: gsutil cors set cors.json gs://\<bucket name\>

## System architecture:

1.  Videos are uploaded with app using password token
2.  Raw video is uploaded to Google Cloud Storage (GCP) bucket via multipart upload.
3.  GCP upload triggers Google Pub/Sub which pushes a notification to the transcoding server.
4.  FFmpeg generates thumbnails with all set qualities.
5.  FFmpeg transcodes video into all set qualities.
6.  Transcoded vidoes are saved to production bucket and data is saved to database.
7.  The app consumes content via streaming.

## Features:

-   Custom-made player
-   Switching between video resolutions: 480p, 720p and 1080p
-   Thumbnails on hover or scrubbing over the timeline
-   Embedded video player support

## Technologies:

-   App: Next.js, MongoDB
-   Video processing: Node.js, FFMpeg, MongoDB
-   Google Cloud Storage and Pub/Sub
-   Deployed on Vercel and Railway
