I’ve taken my Recipe App from a Django REST API to a deployed full-stack website.

Recipe Book lets users build their own recipe collection, upload photos, organize meals with tags and ingredients, filter recipes, and manage their profiles.

The stack:
- React, TypeScript, and Vite for the frontend
- Django REST Framework and token authentication for the API
- PostgreSQL for persistent data
- Docker Compose for local development
- Vercel, Neon, and Vercel Blob for hosting and image storage

The focus was on connecting the complete flow: forms, authenticated API requests, user-owned records, persistent images, and clear loading and error states.

I also added frontend unit tests and real API/browser integration tests covering registration, recipe CRUD, image uploads, refresh persistence, and isolation between two users.

Try it: https://recipe-book-test-flax.vercel.app
Source and setup: https://github.com/adhamabaza/recipe-app-api/tree/updates

I’d appreciate feedback on the experience, code structure, or API design.

#Django #React #TypeScript #PostgreSQL #FullStackDevelopment #Docker
