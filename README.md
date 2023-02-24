# Video uploader & streaming

This is project for uploading video files, processing them into 480p, 720p and 1080p.  
Users can watch them in custom-made player.

-   To set up CORS in <b>GCP CLI</b>: gsutil cors set cors.json gs://\<bucket name\>

## System architecture

1.  Videos is uploaded by using password token
2.  Raw video gets uploaded to Google Cloud Storage (GCP) bucket via multipart upload.
3.  GCP upload triggers Google Pub/sub which pushes notification to transcoding server.
4.  Video gets transcoded into all set qualities and saved to production bucket and database(MongoDB).
5.  App consumes these videos via streaming.
