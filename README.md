# Video Ops

This is project for uploading videos, processing them into 480p, 720p and 1080p.  
After that, you can watch them in custom-made player or embed into other website.

-   To set up CORS in <b>GCP CLI</b>: gsutil cors set cors.json gs://\<bucket name\>

## System architecture

1.  Videos is uploaded in app by using password token
2.  Raw video gets uploaded to Google Cloud Storage (GCP) bucket via multipart upload.
3.  GCP upload triggers Google Pub/Sub which pushes notification to transcoding server.
4.  Video gets transcoded by ffmpeg into all set qualities and saved to production bucket and database.
5.  App consumes these videos via streaming.

## Technologies

-   Frontend is vanilla html, css and javascript
-   Server-side: Node.js (express), ffmpeg, MongoDB
-   Google Cloud Storage and Pub/Sub
-   Deployed on Railway

## Features

-   customized player
-   switching between video resolutions: 480p, 720p and 1080p
-   thumbnails on hover over timeline
-   embed support
