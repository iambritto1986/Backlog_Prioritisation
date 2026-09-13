# Banana OS (Product Planner)

## Project Overview
Banana OS is a client-heavy, collaborative product planning and backlog prioritization workspace. It is designed to facilitate real-time workshop sessions, import deliverables from Excel, and prioritize them into workstreams.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React icons, Framer Motion.
- **Build Tool**: Vite.
- **Backend/Hosting**: Express.js (Node.js) acting as a static file server and lightweight API layer.
- **Real-time Communication**: \socket.io\ for live session authorization (Knock-to-Join).
- **Persistence**: Primarily client-side using browser \localStorage\ via \PersistenceService\.

## Key Features
1. **Excel Import**: Parses requirements and backlog items from uploaded spreadsheets into Deliverable Cards.
2. **Workstreams**: Organizes cards into trackable streams.
3. **Facilitation Room**: A collaborative session space for voting, assessment, and consensus.
4. **Zero-Dependency Portable Workshop Sharing**: Sessions, cards, and project metadata are compressed via \CompressionStream\ into a gzip URL-safe base64 hash. This allows sharing the exact state of a workshop via a simple URL link.
5. **Live Knock-to-Join Authorization**: When guests click a share link, they are intercepted by a \KnockToJoinModal\. Using \socket.io\, they knock on the host's room, and the facilitator can approve or deny their entry in real-time from \SessionRoom.tsx\.

## Architectural Notes
- The application relies heavily on \localStorage\ for data persistence.
- Cross-tab presence (on the same machine) is handled via \BroadcastChannel\ in \PresenceService\.
- Cross-device live authorization uses \socket.io\ connected to the Express backend.
- The project is deployed on Render.
