# KT - AI-Powered Training Content Platform

## Project Description

KT is an AI-powered platform for creating training, onboarding, and session content for companies. The application leverages artificial intelligence to generate professional training materials including scripts, audio narration, thumbnails, and videos.

## Key Features

### Content Generation
- **AI Script Generation**: Automatically generate training scripts based on topics
- **Text-to-Speech**: Convert scripts to professional audio narration using OpenAI's TTS
- **Thumbnail Generation**: Create visual thumbnails for training content
- **Video Creation**: Combine thumbnails and audio into video format
- **Content Management**: Store and manage all training materials in one place

### User Features
- **Authentication**: Secure email/password authentication
- **Personal Library**: Each user maintains their own collection of training content
- **Media Player**: Built-in player for audio and video content
- **Content Actions**: Play, regenerate, and delete training materials

## Technology Stack

### Frontend
- **React 18.3.1**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library
- **Lucide React**: Icon system
- **React Router DOM**: Client-side routing

### Backend (Lovable Cloud / Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with email/password
- **Edge Functions**: Serverless functions for AI integrations
- **Storage**: File and media storage

### AI Integration
- **OpenAI GPT**: Script generation
- **OpenAI TTS**: Text-to-speech audio generation
- **Image Generation**: Thumbnail creation

## Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── Auth.tsx        # Authentication UI
│   │   ├── GeneratePodcastDialog.tsx  # Content generation dialog
│   │   ├── PodcastCard.tsx # Training content card
│   │   ├── PodcastPlayer.tsx # Audio/video player
│   │   └── ui/             # shadcn UI components
│   ├── pages/
│   │   ├── Index.tsx       # Main dashboard
│   │   └── NotFound.tsx    # 404 page
│   ├── utils/
│   │   └── videoGenerator.ts # Client-side video generation
│   ├── integrations/
│   │   └── supabase/       # Supabase client and types
│   └── hooks/              # Custom React hooks
├── supabase/
│   ├── functions/          # Edge functions
│   │   ├── generate-podcast/  # AI script generation
│   │   ├── text-to-speech/    # Audio generation
│   │   └── generate-thumbnail/ # Thumbnail generation
│   └── config.toml         # Supabase configuration
└── public/                 # Static assets
```

## Database Schema

### Tables

#### `podcasts`
Main content storage table with RLS policies.

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, references auth user)
- `title` (text)
- `topic` (text)
- `description` (text, nullable)
- `script` (text, nullable)
- `audio_url` (text, nullable) - Base64 data URL or storage URL
- `thumbnail_url` (text, nullable)
- `video_url` (text, nullable)
- `duration` (text)
- `status` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**RLS Policies:**
- Users can only view their own content
- Users can create, update, and delete their own content

#### `profiles`
User profile information.

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, references auth user)
- `display_name` (text, nullable)
- `avatar_url` (text, nullable)
- `created_at` (timestamp)

## Edge Functions

### `generate-podcast`
Generates AI-powered training scripts using OpenAI GPT.

**Input:**
```typescript
{
  topic: string,
  duration: string
}
```

**Output:**
```typescript
{
  title: string,
  script: string,
  description: string
}
```

### `text-to-speech`
Converts text scripts to audio using OpenAI TTS.

**Input:**
```typescript
{
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"
}
```

**Output:**
```typescript
{
  audioContent: string // Base64 encoded audio
}
```

### `generate-thumbnail`
Creates visual thumbnails for training content.

**Input:**
```typescript
{
  topic: string,
  title: string
}
```

**Output:**
```typescript
{
  thumbnail_url: string
}
```

## Key Components

### `Index.tsx`
Main dashboard component that:
- Manages authentication state
- Displays user's training content library
- Handles content generation, playback, and deletion
- Coordinates AI generation workflows

### `GeneratePodcastDialog.tsx`
Modal dialog for creating new training content:
- Topic and duration input
- Triggers AI script generation
- Creates database records

### `PodcastPlayer.tsx`
Media player component:
- Plays audio and video content
- Displays script and metadata
- Supports regeneration of audio

### `PodcastCard.tsx`
Content card displaying:
- Thumbnail image
- Title and description
- Duration and status
- Action buttons (Play, Generate Audio, Generate Thumbnail, Generate Video, Delete)

### `videoGenerator.ts`
Client-side utility for creating videos:
- Combines static thumbnails with audio
- Uses MediaRecorder API
- Returns video blob for storage

## Authentication Flow

1. User signs up with email/password
2. Email confirmation auto-confirmed (for development)
3. Session stored in localStorage
4. RLS policies enforce user data isolation
5. Sign out clears session and redirects to auth page

## Content Generation Workflow

1. **Create Content**: User enters topic and duration
2. **Generate Script**: AI creates training script via edge function
3. **Generate Audio**: Script converted to speech via OpenAI TTS
4. **Generate Thumbnail**: Visual created for the content
5. **Generate Video**: Thumbnail and audio combined into video
6. **Playback**: User can play audio/video in built-in player

## Environment Variables

Required secrets (configured in Lovable Cloud):
- `OPENAI_API_KEY`: For AI script and audio generation
- `VITE_SUPABASE_URL`: Auto-configured
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Auto-configured
- `VITE_SUPABASE_PROJECT_ID`: Auto-configured

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Configure OpenAI API key in Lovable Cloud secrets
5. Edge functions deploy automatically

## Design System

The application uses a custom design system defined in:
- `src/index.css`: CSS variables and theme tokens
- `tailwind.config.ts`: Tailwind configuration

**Key Design Tokens:**
- Colors use HSL semantic tokens (primary, accent, background, foreground)
- Gradients and shadows use primary colors
- Responsive design with mobile-first approach
- Dark/light mode support

## Security

- Row Level Security (RLS) on all tables
- JWT-based authentication
- Edge functions require authentication
- User data isolation enforced at database level
- Auto-confirm email for development (should be disabled in production)

## Future Enhancements

Potential areas for expansion:
- Cloud storage integration for audio/video files
- Collaboration features for team training
- Analytics and tracking
- Custom voice training
- Multi-language support
- Export options (PDF, SCORM)
