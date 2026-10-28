# SnapShare: Scaling Plan

SnapShare is a photo-sharing app. Users upload photos and scroll a feed of photos from people they follow.

## 1. Assumptions

- There are **10,000,000** registered users.
- **10%** of them are active each day.
- Each active user uploads **1 photo** per day.
- Each active user views **50 feed pages** per day. Each feed page view is one request.
- An average photo is **2 MB**. Each photo also gets a **50 KB** thumbnail.
- One day is about **100,000 seconds** (rounded for easy maths).
- Peak traffic is **5 times** the average.

**Daily active users (DAU):** 10,000,000 × 10% = **1,000,000 users per day**.

## 2. Estimates

### Uploads per second

- Uploads per day: 1,000,000 users × 1 photo = **1,000,000 photos per day**.
- Average: 1,000,000 ÷ 100,000 = **10 uploads per second**.
- Peak: 10 × 5 = **50 uploads per second**.

### Feed views per second

- Feed views per day: 1,000,000 users × 50 = **50,000,000 per day**.
- Average: 50,000,000 ÷ 100,000 = **500 feed views per second**.
- Peak: 500 × 5 = **2,500 feed views per second**.

### Storage per year

- Photos per day: 1,000,000 × 2 MB = 2,000,000 MB = **2 TB per day**.
- Photos per year: 2 TB × 365 = **730 TB per year**.
- Thumbnails per day: 1,000,000 × 50 KB = 50 GB per day.
- Thumbnails per year: 50 GB × 365 ≈ **18 TB per year**.
- Total: about **750 TB per year**.

## 3. Read-heavy or write-heavy?

SnapShare is **read-heavy**. There are about 500 feed views per second but only 10 uploads per second, so there are about **50 times more reads than writes**.

What this means for the design:

- **Cache** feeds and user data, so most reads never reach the database.
- Use a **CDN** to serve photos and thumbnails from servers close to users.
- Add a **read replica** so reads are spread away from the primary database.
- Writes are fewer, but each upload is big (2 MB). So the upload path must be kept fast, and slow work must go to a background worker.

## 4. Why photos should not be stored in the database

- Photos are **big**. 730 TB of photos per year would make the database huge, slow to search, slow to back up and slow to copy to replicas.
- Databases are built for small, structured data (names, ids, dates), and they cost a lot per GB.
- A database cannot serve files to users as fast as a CDN can.

**Where they go instead:** in **object storage** (for example Amazon S3). It is cheap, nearly unlimited, safe (it keeps copies) and works well with a CDN. The database only keeps a **link** to each photo (for example `photo_url`) and the photo's details.

## 5. Architecture diagram

```
   Users (phone / browser)
        │
        │  DNS: snapshare.com → IP address
        │
        ├── photos, thumbnails, CSS, JS ──> ┌─────┐ (miss) ┌────────────────┐
        │                                   │ CDN │ ─────> │ Object storage │
        │                                   └─────┘        │ (photos +      │
        │                                                  │  thumbnails)   │
        │ API calls (HTTPS, JSON)                          └────────────────┘
        v                                                          ^
 ┌───────────────┐                                                 │
 │ Load balancer │                                                 │ saves
 └──────┬────────┘                                                 │ thumbnail
   ┌────┴─────┬──────────┐                                         │
   v          v          v                                         │
┌───────┐ ┌───────┐ ┌───────┐        ┌──────────────┐        ┌────┴───┐
│ App 1 │ │ App 2 │ │ App 3 │ ─────> │ Cache (Redis)│        │ Worker │
└───┬───┘ └───┬───┘ └───┬───┘        └──────────────┘        └────▲───┘
    │ writes  │ reads   │ upload jobs                              │
    v         v         v                                          │
┌─────────┐ ┌──────────┐ ┌───────┐                                │
│ Primary │>│ Read     │ │ Queue │ ───────────────────────────────┘
│   DB    │ │ replica  │ └───────┘
└─────────┘ └──────────┘

Load estimate: 1M DAU | 10 uploads/s (50 peak) | 500 views/s (2,500 peak) | ~750 TB/year
```

## 6. What each component does

- **DNS:** turns `snapshare.com` into the IP address, so users can find the app.
- **CDN:** serves photos, thumbnails and static files from servers close to the user, so pages load fast and our servers carry less load.
- **Load balancer:** spreads requests over several app servers and skips any server that is down, so no single server gets overloaded.
- **App servers:** run the app code (log in, upload, feed), and because they are stateless, we can add more of them when traffic grows.
- **Cache (Redis):** keeps recent feeds and user data in memory, so most of the 500 reads per second are answered without touching the database.
- **Primary database:** stores the users, follows and photo details (like the photo link) and accepts all the writes.
- **Read replica:** holds a copy of the primary and answers reads, so the primary is not overloaded.
- **Object storage:** stores the big photo files cheaply and safely, so the database stays small and fast.
- **Queue:** holds jobs such as "make a thumbnail", so the upload can finish quickly without waiting for slow work.
- **Worker:** takes jobs from the queue and creates the thumbnails in the background, so users never wait for them.

## 7. Upload flow, step by step

1. The user picks a photo in the app. The app sends it to the server over HTTPS, and the request goes to the **load balancer**.
2. The load balancer sends it to a healthy **app server**.
3. The app server checks the user's token and validates the file (type and size).
4. The app server saves the original photo file in **object storage**.
5. The app server writes a row in the **primary database** with the user id, the photo link and a status such as "processing".
6. The app server adds a job to the **queue**: "make a thumbnail for photo 123".
7. The app server replies **201 Created** to the user straight away. The user does not wait for the thumbnail.
8. A **worker** takes the job from the queue. It reads the photo from object storage and creates a 50 KB thumbnail.
9. The worker saves the thumbnail in object storage and updates the database row with the thumbnail link and status "ready".
10. The worker deletes the cached feeds of the user's followers from the **cache**, so the next time they open their feed, it is rebuilt and shows the new photo.
11. Followers' feeds now load the thumbnail through the **CDN**, so it is fast.

## 8. Trade-offs

- **Speed versus freshness.** The cache, the CDN and the read replica make feeds fast, but a feed can be slightly out of date for a short time (for example, a new photo may appear a few seconds late). This is acceptable for a photo feed, and it is not a bank balance.
- **Fast uploads versus instant thumbnails.** Using a queue and a worker means the upload replies quickly, but the thumbnail is ready a little later. While it is processing, the app can show a placeholder.
- **Cost versus reliability.** Extra app servers, a replica and copies of photos in object storage improve uptime and safety, but they cost more money. At about 750 TB a year, storage cost is large, so old photos could later be moved to cheaper storage.
- **Simplicity versus scalability.** One server would be much simpler, but it could not handle 2,500 feed views per second at peak, and it would be a single point of failure.